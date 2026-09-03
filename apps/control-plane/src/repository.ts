import type { DefenseBundle } from "@dadieng/defense-module";
import type { EncryptedThreatEvidence, ReplayReport, ThreatReceipt } from "@dadieng/schemas";
import type { CreateReplayRequest } from "./contracts.js";

export interface ReceiptRecord {
  tenantId: string;
  receipt: ThreatReceipt;
  encryptedEvidence: EncryptedThreatEvidence;
  createdAt: string;
}

export interface DefenseRecord {
  defenseId: string;
  name: string;
  authorAgentId: string;
  createdAt: string;
}

export interface DefenseVersionRecord {
  defenseVersionId: string;
  defenseId: string;
  bundle: DefenseBundle;
  status: "candidate";
  createdAt: string;
}

export interface ReplayJobRecord {
  replayId: string;
  tenantId: string;
  request: CreateReplayRequest;
  status: "queued" | "running" | "completed" | "failed";
  report?: ReplayReport;
  errorCode?: string;
  createdAt: string;
  updatedAt: string;
}

export interface StoredHttpResponse {
  requestHash: string;
  status: number;
  body: unknown;
  headers: Record<string, string>;
}

export interface ControlPlaneRepository {
  getReceipt(receiptId: string): ReceiptRecord | undefined;
  findReceiptByDeduplicationKey(tenantId: string, deduplicationKey: string): ReceiptRecord | undefined;
  saveReceipt(record: ReceiptRecord): void;
  getDefense(defenseId: string): DefenseRecord | undefined;
  saveDefense(record: DefenseRecord): void;
  getDefenseVersion(defenseVersionId: string): DefenseVersionRecord | undefined;
  saveDefenseVersion(record: DefenseVersionRecord): void;
  getReplay(replayId: string): ReplayJobRecord | undefined;
  saveReplay(record: ReplayJobRecord): void;
  nextQueuedReplay(): ReplayJobRecord | undefined;
  getIdempotency(key: string): StoredHttpResponse | undefined;
  saveIdempotency(key: string, response: StoredHttpResponse): void;
}

function copy<T>(value: T): T {
  return structuredClone(value);
}

export class InMemoryControlPlaneRepository implements ControlPlaneRepository {
  private readonly receipts = new Map<string, ReceiptRecord>();
  private readonly defenses = new Map<string, DefenseRecord>();
  private readonly versions = new Map<string, DefenseVersionRecord>();
  private readonly replays = new Map<string, ReplayJobRecord>();
  private readonly idempotency = new Map<string, StoredHttpResponse>();

  getReceipt(receiptId: string) { const value = this.receipts.get(receiptId); return value ? copy(value) : undefined; }
  findReceiptByDeduplicationKey(tenantId: string, deduplicationKey: string) {
    const value = [...this.receipts.values()].find((record) =>
      record.tenantId === tenantId && record.receipt.deduplicationKey === deduplicationKey);
    return value ? copy(value) : undefined;
  }
  saveReceipt(record: ReceiptRecord) { this.receipts.set(record.receipt.receiptId, copy(record)); }
  getDefense(defenseId: string) { const value = this.defenses.get(defenseId); return value ? copy(value) : undefined; }
  saveDefense(record: DefenseRecord) { this.defenses.set(record.defenseId, copy(record)); }
  getDefenseVersion(defenseVersionId: string) { const value = this.versions.get(defenseVersionId); return value ? copy(value) : undefined; }
  saveDefenseVersion(record: DefenseVersionRecord) { this.versions.set(record.defenseVersionId, copy(record)); }
  getReplay(replayId: string) { const value = this.replays.get(replayId); return value ? copy(value) : undefined; }
  saveReplay(record: ReplayJobRecord) { this.replays.set(record.replayId, copy(record)); }
  nextQueuedReplay() {
    const value = [...this.replays.values()].find((record) => record.status === "queued");
    return value ? copy(value) : undefined;
  }
  getIdempotency(key: string) { const value = this.idempotency.get(key); return value ? copy(value) : undefined; }
  saveIdempotency(key: string, response: StoredHttpResponse) { this.idempotency.set(key, copy(response)); }
}
