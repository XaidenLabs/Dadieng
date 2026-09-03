import { randomUUID } from "node:crypto";
import { contentHash, verifyDefenseBundle, type DefenseBundle } from "@dadieng/defense-module";
import { assertPublicReceiptSafe, verifyEvidenceCommitment } from "@dadieng/receipt-sanitizer";
import { runReplay, verifyReplayReport } from "@dadieng/replay-engine";
import type { ReplayReport } from "@dadieng/schemas";
import type { ApiPrincipal } from "./auth.js";
import type {
  CreateDefenseRequest,
  CreateDefenseVersionRequest,
  CreateReceiptRequest,
  CreateReplayRequest,
} from "./contracts.js";
import { ApiProblem } from "./errors.js";
import type {
  ControlPlaneRepository,
  DefenseRecord,
  DefenseVersionRecord,
  ReceiptRecord,
  ReplayJobRecord,
} from "./repository.js";

export interface ControlPlaneRuntime {
  createId(): string;
  now(): string;
}

export type ReplayExecutor = (bundle: DefenseBundle, request: CreateReplayRequest) => ReplayReport;

const defaultRuntime: ControlPlaneRuntime = {
  createId: randomUUID,
  now: () => new Date().toISOString(),
};

const defaultReplayExecutor: ReplayExecutor = (bundle, request) => runReplay(bundle, {
  environment: request.environment,
  ...(request.thresholds ? {
    thresholds: {
      ...(request.thresholds.attackPassRate !== undefined ? { attackPassRate: request.thresholds.attackPassRate } : {}),
      ...(request.thresholds.controlPassRate !== undefined ? { controlPassRate: request.thresholds.controlPassRate } : {}),
      ...(request.thresholds.p95LatencyMs !== undefined ? { p95LatencyMs: request.thresholds.p95LatencyMs } : {}),
    },
  } : {}),
});

export class ControlPlaneService {
  constructor(
    readonly repository: ControlPlaneRepository,
    private readonly runtime: ControlPlaneRuntime = defaultRuntime,
    private readonly replayExecutor: ReplayExecutor = defaultReplayExecutor,
  ) {}

  createReceipt(principal: ApiPrincipal, input: CreateReceiptRequest) {
    let receipt;
    try {
      receipt = assertPublicReceiptSafe(input.receipt);
    } catch {
      throw new ApiProblem(422, "unsafe-public-receipt", "Unsafe public receipt", "The public receipt failed the credential-safety checks.");
    }
    let evidenceMatches = false;
    try {
      evidenceMatches = verifyEvidenceCommitment(receipt, input.encryptedEvidence);
    } catch {
      throw new ApiProblem(422, "invalid-evidence-envelope", "Invalid evidence envelope", "The encrypted evidence envelope could not be verified.");
    }
    if (!evidenceMatches) {
      throw new ApiProblem(422, "evidence-commitment-mismatch", "Evidence commitment mismatch", "The encrypted evidence does not match the public receipt commitment.");
    }
    const duplicate = this.repository.findReceiptByDeduplicationKey(principal.tenantId, receipt.deduplicationKey);
    if (duplicate) return this.receiptResult(duplicate, input.publishCommitment, true);
    if (this.repository.getReceipt(receipt.receiptId)) {
      throw new ApiProblem(409, "receipt-id-conflict", "Receipt ID conflict", "The receipt ID is already registered.");
    }

    const record: ReceiptRecord = {
      tenantId: principal.tenantId,
      receipt,
      encryptedEvidence: input.encryptedEvidence,
      createdAt: this.runtime.now(),
    };
    this.repository.saveReceipt(record);
    return this.receiptResult(record, input.publishCommitment, false);
  }

  getPublicReceipt(receiptId: string) {
    const record = this.repository.getReceipt(receiptId);
    if (!record) throw new ApiProblem(404, "receipt-not-found", "Receipt not found", "No public receipt exists for this ID.");
    return { receipt: record.receipt, resolution: { status: "unresolved" as const } };
  }

  createDefense(principal: ApiPrincipal, input: CreateDefenseRequest): DefenseRecord {
    if (input.authorAgentId !== principal.subject) {
      throw new ApiProblem(403, "author-mismatch", "Author mismatch", "A defense author must match the authenticated subject.");
    }
    if (this.repository.getDefense(input.defenseId)) {
      throw new ApiProblem(409, "defense-conflict", "Defense already exists", "The defense ID is already registered.");
    }
    const record = { ...input, createdAt: this.runtime.now() };
    this.repository.saveDefense(record);
    return record;
  }

  createDefenseVersion(
    principal: ApiPrincipal,
    defenseId: string,
    input: CreateDefenseVersionRequest,
  ): DefenseVersionRecord {
    const defense = this.repository.getDefense(defenseId);
    if (!defense) throw new ApiProblem(404, "defense-not-found", "Defense not found", "Register the defense before publishing a version.");
    if (defense.authorAgentId !== principal.subject) {
      throw new ApiProblem(403, "not-defense-author", "Not defense author", "Only the registered author may publish a version.");
    }
    let bundle;
    try {
      bundle = verifyDefenseBundle(input.bundle);
    } catch {
      throw new ApiProblem(422, "invalid-defense-bundle", "Invalid defense bundle", "The bundle hashes or signed contents could not be verified.");
    }
    if (bundle.manifest.defenseId !== defenseId) {
      throw new ApiProblem(422, "defense-id-mismatch", "Defense ID mismatch", "The bundle identity does not match the route.");
    }
    const defenseVersionId = `${defenseId}@${bundle.manifest.version}`;
    if (this.repository.getDefenseVersion(defenseVersionId)) {
      throw new ApiProblem(409, "version-conflict", "Defense version already exists", "Published versions are immutable.");
    }
    const record: DefenseVersionRecord = {
      defenseVersionId,
      defenseId,
      bundle,
      status: "candidate",
      createdAt: this.runtime.now(),
    };
    this.repository.saveDefenseVersion(record);
    return record;
  }

  createReplay(principal: ApiPrincipal, input: CreateReplayRequest): ReplayJobRecord {
    if (!this.repository.getDefenseVersion(input.defenseVersionId)) {
      throw new ApiProblem(404, "defense-version-not-found", "Defense version not found", "Publish the exact version before scheduling replay.");
    }
    const now = this.runtime.now();
    const record: ReplayJobRecord = {
      replayId: this.runtime.createId(),
      tenantId: principal.tenantId,
      request: input,
      status: "queued",
      createdAt: now,
      updatedAt: now,
    };
    this.repository.saveReplay(record);
    return record;
  }

  getReplay(replayId: string): ReplayJobRecord {
    const record = this.repository.getReplay(replayId);
    if (!record) throw new ApiProblem(404, "replay-not-found", "Replay not found", "No replay exists for this ID.");
    return record;
  }

  runNextReplay(): ReplayJobRecord | undefined {
    const job = this.repository.nextQueuedReplay();
    if (!job) return undefined;
    job.status = "running";
    job.updatedAt = this.runtime.now();
    this.repository.saveReplay(job);

    const version = this.repository.getDefenseVersion(job.request.defenseVersionId);
    if (!version) return this.failReplay(job, "DEFENSE_VERSION_MISSING");
    try {
      const report = this.replayExecutor(version.bundle, job.request);
      verifyReplayReport(report, version.bundle);
      job.status = "completed";
      job.report = report;
      job.updatedAt = this.runtime.now();
      this.repository.saveReplay(job);
      return job;
    } catch {
      return this.failReplay(job, "REPLAY_EXECUTION_FAILED");
    }
  }

  private failReplay(job: ReplayJobRecord, errorCode: string): ReplayJobRecord {
    job.status = "failed";
    job.errorCode = errorCode;
    job.updatedAt = this.runtime.now();
    this.repository.saveReplay(job);
    return job;
  }

  private receiptResult(record: ReceiptRecord, publishCommitment: boolean, duplicate: boolean) {
    return {
      receiptId: record.receipt.receiptId,
      status: duplicate ? "duplicate" as const : "sanitized" as const,
      publicHash: contentHash(record.receipt),
      chain: {
        status: publishCommitment ? "awaiting-adapter" as const : "not-requested" as const,
        operationId: null,
      },
    };
  }
}
