import { randomUUID } from "node:crypto";
import { ZodError, type ZodType } from "zod";
import { contentHash, verifyDefenseBundle } from "@dadieng/defense-module";
import type { ApiAuthenticator, ApiPrincipal, ApiScope } from "./auth.js";
import { requireScope } from "./auth.js";
import {
  createDefenseRequestSchema,
  createDefenseVersionRequestSchema,
  createReceiptRequestSchema,
  createReplayRequestSchema,
} from "./contracts.js";
import { ApiProblem, type ProblemDetails } from "./errors.js";
import type { StoredHttpResponse } from "./repository.js";
import { ControlPlaneService } from "./service.js";

const MAX_BODY_BYTES = 1_048_576;
const IDEMPOTENCY_KEY_PATTERN = /^[A-Za-z0-9._:-]{1,128}$/;

export interface HttpRuntime {
  createRequestId(): string;
}

export interface RequestContext {
  clientId?: string;
}

export interface RateLimitResult {
  allowed: boolean;
  retryAfterSeconds: number;
}

export interface RateLimiter {
  consume(clientId: string): RateLimitResult;
}

export class FixedWindowRateLimiter implements RateLimiter {
  private readonly windows = new Map<string, { startedAt: number; count: number }>();

  constructor(
    private readonly limit = 120,
    private readonly windowMs = 60_000,
    private readonly now: () => number = Date.now,
  ) {}

  consume(clientId: string): RateLimitResult {
    const now = this.now();
    const current = this.windows.get(clientId);
    const window = !current || now - current.startedAt >= this.windowMs
      ? { startedAt: now, count: 0 }
      : current;
    window.count += 1;
    this.windows.set(clientId, window);
    return {
      allowed: window.count <= this.limit,
      retryAfterSeconds: Math.max(1, Math.ceil((window.startedAt + this.windowMs - now) / 1_000)),
    };
  }
}

interface RouteResult {
  status: number;
  body: Record<string, unknown>;
  headers?: Record<string, string>;
}

const defaultHttpRuntime: HttpRuntime = { createRequestId: randomUUID };

function fieldErrors(error: ZodError): Record<string, string[]> {
  const fields: Record<string, string[]> = {};
  for (const issue of error.issues) {
    const key = issue.path.map(String).join(".") || "body";
    (fields[key] ??= []).push(issue.message);
  }
  return fields;
}

function problemFrom(error: unknown, requestId: string): ProblemDetails {
  if (error instanceof ApiProblem) {
    return {
      type: `https://dadieng.dev/problems/${error.type}`,
      title: error.title,
      status: error.status,
      detail: error.message,
      requestId,
      ...(error.fieldErrors ? { fieldErrors: error.fieldErrors } : {}),
    };
  }
  if (error instanceof ZodError) {
    return {
      type: "https://dadieng.dev/problems/validation-error",
      title: "Validation error",
      status: 422,
      detail: "The request body did not match the API contract.",
      requestId,
      fieldErrors: fieldErrors(error),
    };
  }
  return {
    type: "https://dadieng.dev/problems/internal-error",
    title: "Internal error",
    status: 500,
    detail: "The request could not be completed.",
    requestId,
  };
}

function response(status: number, body: unknown, contentType: string, headers: Record<string, string> = {}): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "content-type": contentType,
      "x-content-type-options": "nosniff",
      ...headers,
    },
  });
}

function jsonResponse(result: RouteResult, requestId: string): Response {
  return response(result.status, { ...result.body, requestId }, "application/json", {
    "cache-control": "no-store",
    ...result.headers,
  });
}

function storedResponse(stored: StoredHttpResponse): Response {
  return response(stored.status, stored.body, "application/json", stored.headers);
}

async function parseBody<T>(request: Request, schema: ZodType<T>): Promise<{ parsed: T; rawHash: string }> {
  if (!request.headers.get("content-type")?.toLowerCase().includes("application/json")) {
    throw new ApiProblem(415, "unsupported-media-type", "Unsupported media type", "Write requests require application/json.");
  }
  const text = await request.text();
  if (Buffer.byteLength(text) > MAX_BODY_BYTES) {
    throw new ApiProblem(413, "request-too-large", "Request too large", "The JSON body exceeds 1 MiB.");
  }
  let body: unknown;
  try {
    body = JSON.parse(text);
  } catch {
    throw new ApiProblem(400, "invalid-json", "Invalid JSON", "The request body is not valid JSON.");
  }
  return { parsed: schema.parse(body), rawHash: contentHash(body) };
}

export class ControlPlaneHttpApp {
  constructor(
    readonly service: ControlPlaneService,
    private readonly authenticator: ApiAuthenticator,
    private readonly rateLimiter: RateLimiter = new FixedWindowRateLimiter(),
    private readonly runtime: HttpRuntime = defaultHttpRuntime,
  ) {}

  async handle(request: Request, context: RequestContext = {}): Promise<Response> {
    const requestId = this.runtime.createRequestId();
    try {
      const rate = this.rateLimiter.consume(context.clientId ?? "anonymous");
      if (!rate.allowed) {
        const problem = problemFrom(new ApiProblem(429, "rate-limit-exceeded", "Rate limit exceeded", "Retry after the current rate-limit window."), requestId);
        return response(429, problem, "application/problem+json", { "retry-after": String(rate.retryAfterSeconds) });
      }

      const url = new URL(request.url);
      const path = url.pathname;
      if (request.method === "GET" && path === "/health") {
        return jsonResponse({ status: 200, body: { status: "ok" }, headers: { "cache-control": "no-store" } }, requestId);
      }

      const receiptMatch = path.match(/^\/v1\/receipts\/([A-Za-z0-9._:-]+)$/);
      if (request.method === "GET" && receiptMatch?.[1]) {
        return jsonResponse({
          status: 200,
          body: this.service.getPublicReceipt(receiptMatch[1]),
          headers: { "cache-control": "public, max-age=60" },
        }, requestId);
      }

      const replayMatch = path.match(/^\/v1\/replays\/([A-Za-z0-9._:-]+)$/);
      if (request.method === "GET" && replayMatch?.[1]) {
        const job = this.service.getReplay(replayMatch[1]);
        return jsonResponse({
          status: 200,
          body: {
            replayId: job.replayId,
            status: job.status,
            ...(job.report ? { report: job.report } : {}),
            ...(job.errorCode ? { errorCode: job.errorCode } : {}),
          },
          headers: { "cache-control": job.status === "completed" ? "public, max-age=60" : "no-store" },
        }, requestId);
      }

      if (request.method === "POST" && path === "/v1/receipts") {
        return await this.write(request, requestId, "receipts:write", createReceiptRequestSchema, (principal, input) => {
          const result = this.service.createReceipt(principal, input);
          return { status: result.status === "duplicate" ? 200 : 201, body: result };
        });
      }
      if (request.method === "POST" && path === "/v1/defenses") {
        return await this.write(request, requestId, "defenses:write", createDefenseRequestSchema, (principal, input) => ({
          status: 201,
          body: { defense: this.service.createDefense(principal, input) },
        }));
      }
      const versionMatch = path.match(/^\/v1\/defenses\/([A-Za-z0-9._:-]+)\/versions$/);
      if (request.method === "POST" && versionMatch?.[1]) {
        return await this.write(request, requestId, "defenses:write", createDefenseVersionRequestSchema, (principal, input) => {
          const version = this.service.createDefenseVersion(principal, versionMatch[1]!, input);
          const verified = verifyDefenseBundle(version.bundle);
          return {
            status: 201,
            body: {
              defenseVersionId: version.defenseVersionId,
              status: version.status,
              manifestHash: verified.manifestHash,
            },
          };
        });
      }
      if (request.method === "POST" && path === "/v1/replays") {
        return await this.write(request, requestId, "replays:write", createReplayRequestSchema, (principal, input) => {
          const replay = this.service.createReplay(principal, input);
          return { status: 202, body: { replayId: replay.replayId, status: replay.status } };
        });
      }

      if (path.startsWith("/v1/attestations") || path.startsWith("/v1/channels/")
        || path.startsWith("/v1/usage/") || path.startsWith("/v1/approvals")) {
        throw new ApiProblem(501, "phase-not-implemented", "Endpoint not implemented", "This endpoint belongs to a later Dadieng build phase.");
      }
      throw new ApiProblem(404, "route-not-found", "Route not found", "No API route matches this request.");
    } catch (error) {
      const problem = problemFrom(error, requestId);
      return response(problem.status, problem, "application/problem+json", { "cache-control": "no-store" });
    }
  }

  private async write<T>(
    request: Request,
    requestId: string,
    scope: ApiScope,
    schema: ZodType<T>,
    action: (principal: ApiPrincipal, input: T) => RouteResult,
  ): Promise<Response> {
    const principal = this.authenticator.authenticate(request.headers.get("authorization"));
    requireScope(principal, scope);
    const idempotencyKey = request.headers.get("idempotency-key");
    if (!idempotencyKey || !IDEMPOTENCY_KEY_PATTERN.test(idempotencyKey)) {
      throw new ApiProblem(400, "invalid-idempotency-key", "Invalid idempotency key", "Write requests require a public-safe Idempotency-Key of 1-128 characters.");
    }
    const { parsed, rawHash } = await parseBody(request, schema);
    const storageKey = `${principal.tenantId}:${principal.subject}:${request.method}:${new URL(request.url).pathname}:${idempotencyKey}`;
    const existing = this.service.repository.getIdempotency(storageKey);
    if (existing) {
      if (existing.requestHash !== rawHash) {
        throw new ApiProblem(409, "idempotency-conflict", "Idempotency conflict", "The Idempotency-Key was already used with another request body.");
      }
      return storedResponse(existing);
    }

    const result = action(principal, parsed);
    const body = { ...result.body, requestId };
    const headers = { "cache-control": "no-store", ...(result.headers ?? {}) };
    this.service.repository.saveIdempotency(storageKey, {
      requestHash: rawHash,
      status: result.status,
      body,
      headers,
    });
    return response(result.status, body, "application/json", headers);
  }
}
