import { z } from "zod";

export const DADIENG_EVENT_SCHEMA_VERSION = "dadieng.event.v1" as const;
export const DADIENG_DECISION_SCHEMA_VERSION = "dadieng.decision.v1" as const;
export const DADIENG_RECEIPT_SCHEMA_VERSION = "dadieng.receipt.v1" as const;
export const DADIENG_DEFENSE_SCHEMA_VERSION = "dadieng.defense.v1" as const;
export const DADIENG_REPLAY_SCHEMA_VERSION = "dadieng.replay-report.v1" as const;
export const DADIENG_ATTESTATION_SCHEMA_VERSION = "dadieng.attestation.v1" as const;
export const DADIENG_MANIFEST_SCHEMA_VERSION = "dadieng.stable-manifest.v1" as const;

export const hashSchema = z.string().regex(/^sha256:[a-f0-9]{64}$/, "Expected a sha256 content hash");
export const timestampSchema = z.string().datetime({ offset: true });
export const trustZoneSchema = z.enum(["trusted", "tenant", "external", "untrusted"]);
export const eventStageSchema = z.enum(["before_model", "after_model", "before_tool", "after_tool"]);
export const impactSchema = z.enum(["low", "medium", "high", "critical"]);
export const enforcementModeSchema = z.enum(["observe", "enforce"]);
export const decisionOutcomeSchema = z.enum([
  "ALLOW",
  "BLOCK",
  "REDACT",
  "REQUIRE_APPROVAL",
  "SANDBOX",
  "OBSERVE",
]);
export const attackClassSchema = z.enum([
  "prompt_injection",
  "tool_poisoning",
  "privilege_escalation",
  "data_exfiltration",
  "malicious_module",
]);

export const dadiengEventSchema = z.object({
  schemaVersion: z.literal(DADIENG_EVENT_SCHEMA_VERSION),
  eventId: z.string().min(1),
  timestamp: timestampSchema,
  agent: z.object({
    agentId: z.string().min(1),
    framework: z.string().min(1),
    sdkVersion: z.string().min(1),
  }),
  stage: eventStageSchema,
  source: z.object({
    type: z.string().min(1),
    identity: z.string().min(1).optional(),
    trustZone: trustZoneSchema,
  }),
  capability: z.object({
    name: z.string().min(1),
    impact: impactSchema,
  }).optional(),
  content: z.string(),
  contentReferences: z.array(z.object({
    type: z.string().min(1),
    fingerprint: hashSchema,
  })),
  policyContext: z.object({
    channel: z.string().min(1),
    mode: enforcementModeSchema,
  }),
});

export const policyDecisionSchema = z.object({
  schemaVersion: z.literal(DADIENG_DECISION_SCHEMA_VERSION),
  decisionId: z.string().min(1),
  eventId: z.string().min(1),
  outcome: decisionOutcomeSchema,
  reasonCodes: z.array(z.string().min(1)).min(1),
  matchedDefenseIds: z.array(z.string().min(1)),
  evaluatedAt: timestampSchema,
});

export const threatReceiptSchema = z.object({
  schemaVersion: z.literal(DADIENG_RECEIPT_SCHEMA_VERSION),
  receiptId: z.string().min(1),
  observedAt: timestampSchema,
  reporterAgentId: z.string().min(1),
  classification: z.object({
    attackClass: attackClassSchema,
    severity: impactSchema,
    confidence: z.number().min(0).max(1),
  }),
  affectedCapability: z.string().min(1),
  sanitizedSummary: z.string().min(1).max(500),
  sourceFingerprint: hashSchema,
  publicEvidenceHash: hashSchema,
  privacy: z.object({
    containsRawPrompt: z.literal(false),
    containsCredentials: z.literal(false),
    redactionPolicy: z.literal("dadieng.public-receipt.v1"),
  }),
});

export const defenseManifestSchema = z.object({
  schemaVersion: z.literal(DADIENG_DEFENSE_SCHEMA_VERSION),
  defenseId: z.string().min(1),
  version: z.string().regex(/^\d+\.\d+\.\d+$/, "Expected a semantic version"),
  name: z.string().min(1),
  authorAgentId: z.string().min(1),
  runtime: z.enum(["typescript", "wasm"]),
  entrypoint: z.string().min(1),
  permissions: z.object({
    network: z.literal(false),
    filesystem: z.enum(["none", "temporary"]),
    clock: z.literal(false),
  }),
  compatibility: z.object({
    sdk: z.string().min(1),
    adapters: z.array(z.string().min(1)),
    eventSchemas: z.array(z.string().min(1)).min(1),
  }),
  expectedOutcomes: z.array(decisionOutcomeSchema).min(1),
  artifactHash: hashSchema,
  suiteHash: hashSchema,
  sbomHash: hashSchema,
});

const replayResultSummarySchema = z.object({
  passed: z.number().int().nonnegative(),
  failed: z.number().int().nonnegative(),
  total: z.number().int().nonnegative(),
}).superRefine((result, context) => {
  if (result.passed + result.failed !== result.total) {
    context.addIssue({ code: "custom", message: "passed + failed must equal total" });
  }
});

export const replayReportSchema = z.object({
  schemaVersion: z.literal(DADIENG_REPLAY_SCHEMA_VERSION),
  runId: z.string().min(1),
  chainId: z.number().int().positive(),
  registryAddress: z.string().regex(/^0x[a-fA-F0-9]{40}$/),
  defenseVersionId: z.string().min(1),
  environment: z.object({
    imageDigest: hashSchema,
    seed: z.number().int().nonnegative(),
    network: z.literal("none"),
  }),
  attackResults: replayResultSummarySchema,
  controlResults: replayResultSummarySchema,
  latency: z.object({
    p50: z.number().nonnegative(),
    p95: z.number().nonnegative(),
    max: z.number().nonnegative(),
  }),
  artifactHash: hashSchema,
  suiteHash: hashSchema,
  reportHash: hashSchema,
  createdAt: timestampSchema,
});

export const validatorAttestationSchema = z.object({
  schemaVersion: z.literal(DADIENG_ATTESTATION_SCHEMA_VERSION),
  attestationId: z.string().min(1),
  validatorAgentId: z.string().min(1),
  chainId: z.number().int().positive(),
  registryAddress: z.string().regex(/^0x[a-fA-F0-9]{40}$/),
  defenseVersionId: z.string().min(1),
  artifactHash: hashSchema,
  suiteHash: hashSchema,
  reportHash: hashSchema,
  passed: z.boolean(),
  signedAt: timestampSchema,
  signature: z.string().min(1),
});

export const stableManifestSchema = z.object({
  schemaVersion: z.literal(DADIENG_MANIFEST_SCHEMA_VERSION),
  channel: z.string().min(1),
  generatedAt: timestampSchema,
  chainId: z.number().int().positive(),
  registryAddress: z.string().regex(/^0x[a-fA-F0-9]{40}$/),
  versions: z.array(z.object({
    defenseId: z.string().min(1),
    version: z.string().regex(/^\d+\.\d+\.\d+$/),
    artifactHash: hashSchema,
    artifactUri: z.string().min(1),
    status: z.literal("stable"),
  })),
  previousManifestHash: hashSchema.nullable(),
  signature: z.string().min(1),
});

export type TrustZone = z.infer<typeof trustZoneSchema>;
export type EventStage = z.infer<typeof eventStageSchema>;
export type Impact = z.infer<typeof impactSchema>;
export type EnforcementMode = z.infer<typeof enforcementModeSchema>;
export type DecisionOutcome = z.infer<typeof decisionOutcomeSchema>;
export type AttackClass = z.infer<typeof attackClassSchema>;
export type DadiengEvent = z.infer<typeof dadiengEventSchema>;
export type PolicyDecision = z.infer<typeof policyDecisionSchema>;
export type ThreatReceipt = z.infer<typeof threatReceiptSchema>;
export type DefenseManifest = z.infer<typeof defenseManifestSchema>;
export type ReplayReport = z.infer<typeof replayReportSchema>;
export type ValidatorAttestation = z.infer<typeof validatorAttestationSchema>;
export type StableManifest = z.infer<typeof stableManifestSchema>;

export interface DefenseRule {
  defenseId: string;
  version: string;
  evaluate(event: DadiengEvent): Omit<PolicyDecision, "schemaVersion" | "decisionId" | "eventId" | "evaluatedAt"> | null;
}
