import { randomUUID } from "node:crypto";
import {
  DADIENG_DECISION_SCHEMA_VERSION,
  dadiengEventSchema,
  policyDecisionSchema,
  type DadiengEvent,
  type DefenseRule,
  type PolicyDecision,
} from "@dadieng/schemas";

const INSTRUCTION_OVERRIDE_PATTERNS = [
  /ignore (all |any )?(previous|prior) instructions?/i,
  /system override/i,
  /do not tell (the )?user/i,
  /bypass (the )?(policy|permission|approval)/i,
];

const SECRET_ACCESS_PATTERNS = [
  /process\.env/i,
  /api[_ -]?keys?/i,
  /credentials?/i,
  /private[_ -]?keys?/i,
  /seed phrase/i,
];

const EXFILTRATION_PATTERNS = [
  /https?:\/\//i,
  /upload/i,
  /send (the |all )?(secret|credential|key|file|data)/i,
  /exfiltrat/i,
];

function matchesAny(content: string, patterns: RegExp[]): boolean {
  return patterns.some((pattern) => pattern.test(content));
}

export const mcpBoundaryDefense: DefenseRule = {
  defenseId: "dadieng.mcp-boundary",
  version: "0.1.0",
  evaluate(event) {
    if (event.stage !== "after_tool" || event.source.trustZone !== "untrusted") {
      return null;
    }

    const hasOverride = matchesAny(event.content, INSTRUCTION_OVERRIDE_PATTERNS);
    const hasSecretAccess = matchesAny(event.content, SECRET_ACCESS_PATTERNS);
    const hasExfiltration = matchesAny(event.content, EXFILTRATION_PATTERNS);

    if (!hasOverride || (!hasSecretAccess && !hasExfiltration)) {
      return null;
    }

    return {
      outcome: event.policyContext.mode === "enforce" ? "BLOCK" : "OBSERVE",
      reasonCodes: [
        "UNTRUSTED_TOOL_INSTRUCTION",
        ...(hasSecretAccess ? ["SECRET_ACCESS_REQUEST"] : []),
        ...(hasExfiltration ? ["EXFILTRATION_REQUEST"] : []),
      ],
      matchedDefenseIds: [`${this.defenseId}@${this.version}`],
    };
  },
};

export interface PolicyEngineRuntime {
  createId(): string;
  now(): string;
}

const defaultRuntime: PolicyEngineRuntime = {
  createId: randomUUID,
  now: () => new Date().toISOString(),
};

export class LocalPolicyEngine {
  constructor(
    private readonly defenses: DefenseRule[],
    private readonly runtime: PolicyEngineRuntime = defaultRuntime,
  ) {}

  evaluate(event: DadiengEvent): PolicyDecision {
    dadiengEventSchema.parse(event);

    for (const defense of this.defenses) {
      const result = defense.evaluate(event);
      if (result) {
        return policyDecisionSchema.parse({
          ...result,
          schemaVersion: DADIENG_DECISION_SCHEMA_VERSION,
          decisionId: this.runtime.createId(),
          eventId: event.eventId,
          evaluatedAt: this.runtime.now(),
        });
      }
    }

    return policyDecisionSchema.parse({
      schemaVersion: DADIENG_DECISION_SCHEMA_VERSION,
      decisionId: this.runtime.createId(),
      eventId: event.eventId,
      outcome: "ALLOW",
      reasonCodes: ["NO_DEFENSE_MATCH"],
      matchedDefenseIds: [],
      evaluatedAt: this.runtime.now(),
    });
  }
}
