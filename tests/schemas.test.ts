import { describe, expect, it } from "vitest";
import {
  DADIENG_DEFENSE_SCHEMA_VERSION,
  DADIENG_REPLAY_SCHEMA_VERSION,
  defenseManifestSchema,
  replayReportSchema,
} from "@dadieng/schemas";

const HASH = `sha256:${"a".repeat(64)}`;

describe("Dadieng shared schemas", () => {
  it("accepts a sandboxed, content-addressed Defense Module manifest", () => {
    const result = defenseManifestSchema.parse({
      schemaVersion: DADIENG_DEFENSE_SCHEMA_VERSION,
      defenseId: "dadieng.mcp-boundary",
      version: "0.1.0",
      name: "MCP Boundary Defense",
      authorAgentId: "agent_author_001",
      runtime: "typescript",
      entrypoint: "dist/index.js",
      permissions: { network: false, filesystem: "temporary", clock: false },
      compatibility: {
        sdk: ">=0.1.0 <1.0.0",
        adapters: ["mcp"],
        eventSchemas: ["dadieng.event.v1"],
      },
      expectedOutcomes: ["ALLOW", "BLOCK"],
      artifactHash: HASH,
      suiteHash: HASH,
      sbomHash: HASH,
    });

    expect(result.permissions.network).toBe(false);
  });

  it("rejects Defense Modules that request network access", () => {
    const result = defenseManifestSchema.safeParse({
      schemaVersion: DADIENG_DEFENSE_SCHEMA_VERSION,
      defenseId: "unsafe",
      version: "0.1.0",
      name: "Unsafe module",
      authorAgentId: "agent_author_001",
      runtime: "typescript",
      entrypoint: "index.js",
      permissions: { network: true, filesystem: "none", clock: false },
      compatibility: { sdk: ">=0.1.0", adapters: ["mcp"], eventSchemas: ["dadieng.event.v1"] },
      expectedOutcomes: ["BLOCK"],
      artifactHash: HASH,
      suiteHash: HASH,
      sbomHash: HASH,
    });

    expect(result.success).toBe(false);
  });

  it("rejects internally inconsistent replay totals", () => {
    const result = replayReportSchema.safeParse({
      schemaVersion: DADIENG_REPLAY_SCHEMA_VERSION,
      runId: "run_001",
      chainId: 10143,
      registryAddress: `0x${"1".repeat(40)}`,
      defenseVersionId: "dadieng.mcp-boundary@0.1.0",
      environment: { imageDigest: HASH, seed: 42, network: "none" },
      attackResults: { passed: 19, failed: 0, total: 20 },
      controlResults: { passed: 20, failed: 0, total: 20 },
      latency: { p50: 1, p95: 2, max: 3 },
      artifactHash: HASH,
      suiteHash: HASH,
      reportHash: HASH,
      createdAt: "2026-09-03T00:00:00.000Z",
    });

    expect(result.success).toBe(false);
  });
});
