import { createHash, randomUUID } from "node:crypto";
import {
  DADIENG_RECEIPT_SCHEMA_VERSION,
  threatReceiptSchema,
  type AttackClass,
  type DadiengEvent,
  type PolicyDecision,
  type ThreatReceipt,
} from "@dadieng/schemas";

const ATTACK_CLASS_BY_REASON: Record<string, AttackClass> = {
  UNTRUSTED_TOOL_INSTRUCTION: "tool_poisoning",
  SECRET_ACCESS_REQUEST: "data_exfiltration",
  EXFILTRATION_REQUEST: "data_exfiltration",
};

function sha256(value: string): string {
  return `sha256:${createHash("sha256").update(value).digest("hex")}`;
}

function classify(decision: PolicyDecision): AttackClass {
  for (const reason of decision.reasonCodes) {
    const attackClass = ATTACK_CLASS_BY_REASON[reason];
    if (attackClass) return attackClass;
  }
  return "prompt_injection";
}

export function createThreatReceipt(
  event: DadiengEvent,
  decision: PolicyDecision,
  createId: () => string = randomUUID,
): ThreatReceipt {
  if (decision.outcome !== "BLOCK" && decision.outcome !== "OBSERVE") {
    throw new Error(`Cannot create a threat receipt for ${decision.outcome}`);
  }

  const sourceFingerprint = event.contentReferences[0]?.fingerprint ?? sha256(event.source.type);
  const evidenceCommitment = sha256(
    JSON.stringify({
      eventId: event.eventId,
      contentHash: sha256(event.content),
      decision: decision.outcome,
      reasons: decision.reasonCodes,
    }),
  );

  return threatReceiptSchema.parse({
    schemaVersion: DADIENG_RECEIPT_SCHEMA_VERSION,
    receiptId: createId(),
    observedAt: event.timestamp,
    reporterAgentId: event.agent.agentId,
    classification: {
      attackClass: classify(decision),
      severity: event.capability?.impact ?? "medium",
      confidence: 0.98,
    },
    affectedCapability: event.capability?.name ?? "unknown",
    sanitizedSummary: `Blocked an untrusted ${event.source.type} instruction (${decision.reasonCodes.join(", ")}).`,
    sourceFingerprint,
    publicEvidenceHash: evidenceCommitment,
    privacy: {
      containsRawPrompt: false,
      containsCredentials: false,
      redactionPolicy: "dadieng.public-receipt.v1",
    },
  });
}
