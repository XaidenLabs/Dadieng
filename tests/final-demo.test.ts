import { describe, expect, it } from "vitest";
import { runFinalDemo } from "../examples/full-protocol-demo/src/demo.js";

describe("final protocol demonstration", () => {
  it("completes the eight-stage network defense story", async () => {
    const report = await runFinalDemo(100);
    expect(report.stages.map((stage) => stage.system)).toEqual([
      "Agent A + Dadieng SDK", "Mera evidence boundary", "Qwen red-team planner",
      "Replay workers × 100", "Chainlink CRE + validators", "Monad lifecycle finalization",
      "Envio derived graph", "Agent B stable sync",
    ]);
    expect(report.stages.every((stage) => stage.status === "passed")).toBe(true);
  });

  it("proves 100 deterministic replays, quorum, indexing, and second-agent utility", async () => {
    const report = await runFinalDemo(100);
    expect(report.replayExecutions).toBe(100);
    expect(report.validatorIds).toEqual(["validator-4001", "validator-4002"]);
    expect(report.envio).toEqual({ stableVersions: 1, stale: false });
    expect(report.agentA.decision).toBe("BLOCK");
    expect(report.agentB).toMatchObject({ syncedChannel: "stable", attackDecision: "BLOCK", controlDecision: "ALLOW" });
  });

  it("keeps hostile and private evidence out of the final report", async () => {
    const serialized = JSON.stringify(await runFinalDemo(100));
    expect(serialized).not.toMatch(/process\.env|evil\.invalid|private synthetic|credential value/i);
    expect(serialized).toMatch(/sha256:[a-f0-9]{64}/);
  });
});
