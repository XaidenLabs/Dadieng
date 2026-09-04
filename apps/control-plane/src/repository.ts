import { randomUUID } from "node:crypto";
import type { QueryResult, QueryResultRow } from "pg";
import type { DefenseBundle } from "@dadieng/defense-module";
import { replayReportSchema, threatReceiptSchema, type ReplayReport, type ThreatReceipt } from "@dadieng/schemas";
import { createReplayRequestSchema, defenseBundleSchema, type CreateReplayRequest } from "./contracts.js";

export interface EvidenceObjectReference {
  uri: string;
  hash: string;
  sizeBytes: number;
  storedAt: string;
}

export interface ReceiptRecord {
  tenantId: string;
  receipt: ThreatReceipt;
  evidenceHash: string;
  evidenceObject?: EvidenceObjectReference;
  evidenceDeletedAt?: string;
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

export type IdempotencyClaim =
  | { outcome: "claimed"; token: string }
  | { outcome: "replay"; response: StoredHttpResponse }
  | { outcome: "conflict" }
  | { outcome: "in-progress" };

export interface ReceiptSaveResult {
  created: boolean;
  record: ReceiptRecord;
}

export interface ControlPlaneRepository {
  healthCheck(): Promise<void>;
  getReceipt(receiptId: string): Promise<ReceiptRecord | undefined>;
  getReceiptForTenant(tenantId: string, receiptId: string): Promise<ReceiptRecord | undefined>;
  saveReceipt(record: ReceiptRecord): Promise<ReceiptSaveResult>;
  saveDefense(record: DefenseRecord): Promise<boolean>;
  getDefense(defenseId: string): Promise<DefenseRecord | undefined>;
  saveDefenseVersion(record: DefenseVersionRecord): Promise<boolean>;
  getDefenseVersion(defenseVersionId: string): Promise<DefenseVersionRecord | undefined>;
  saveReplay(record: ReplayJobRecord): Promise<void>;
  getReplay(replayId: string): Promise<ReplayJobRecord | undefined>;
  claimNextReplay(updatedAt: string): Promise<ReplayJobRecord | undefined>;
  claimIdempotency(key: string, requestHash: string, createdAt: string): Promise<IdempotencyClaim>;
  completeIdempotency(key: string, token: string, response: StoredHttpResponse, completedAt: string): Promise<void>;
  abandonIdempotency(key: string, token: string): Promise<void>;
  listExpiredEvidence(cutoff: string, limit: number): Promise<ReceiptRecord[]>;
  markEvidenceDeleted(receiptId: string, deletedAt: string): Promise<void>;
}

function copy<T>(value: T): T {
  return structuredClone(value);
}

export class InMemoryControlPlaneRepository implements ControlPlaneRepository {
  private readonly receipts = new Map<string, ReceiptRecord>();
  private readonly receiptDeduplication = new Map<string, string>();
  private readonly defenses = new Map<string, DefenseRecord>();
  private readonly versions = new Map<string, DefenseVersionRecord>();
  private readonly replays = new Map<string, ReplayJobRecord>();
  private readonly idempotency = new Map<string, { requestHash: string; token: string; expiresAt: string; response?: StoredHttpResponse }>();

  async healthCheck(): Promise<void> {}

  async getReceipt(receiptId: string) { const value = this.receipts.get(receiptId); return value ? copy(value) : undefined; }
  async getReceiptForTenant(tenantId: string, receiptId: string) {
    const value = this.receipts.get(receiptId);
    return value?.tenantId === tenantId ? copy(value) : undefined;
  }
  async saveReceipt(record: ReceiptRecord): Promise<ReceiptSaveResult> {
    const deduplicationKey = `${record.tenantId}:${record.receipt.deduplicationKey}`;
    const duplicateId = this.receiptDeduplication.get(deduplicationKey);
    if (duplicateId) return { created: false, record: copy(this.receipts.get(duplicateId)!) };
    if (this.receipts.has(record.receipt.receiptId)) throw new RepositoryConflictError("receipt-id");
    this.receipts.set(record.receipt.receiptId, copy(record));
    this.receiptDeduplication.set(deduplicationKey, record.receipt.receiptId);
    return { created: true, record: copy(record) };
  }
  async saveDefense(record: DefenseRecord) {
    if (this.defenses.has(record.defenseId)) return false;
    this.defenses.set(record.defenseId, copy(record));
    return true;
  }
  async getDefense(defenseId: string) { const value = this.defenses.get(defenseId); return value ? copy(value) : undefined; }
  async saveDefenseVersion(record: DefenseVersionRecord) {
    if (this.versions.has(record.defenseVersionId)) return false;
    this.versions.set(record.defenseVersionId, copy(record));
    return true;
  }
  async getDefenseVersion(defenseVersionId: string) { const value = this.versions.get(defenseVersionId); return value ? copy(value) : undefined; }
  async saveReplay(record: ReplayJobRecord) { this.replays.set(record.replayId, copy(record)); }
  async getReplay(replayId: string) { const value = this.replays.get(replayId); return value ? copy(value) : undefined; }
  async claimNextReplay(updatedAt: string) {
    const value = [...this.replays.values()].find((record) => record.status === "queued");
    if (!value) return undefined;
    value.status = "running";
    value.updatedAt = updatedAt;
    this.replays.set(value.replayId, copy(value));
    return copy(value);
  }
  async claimIdempotency(key: string, requestHash: string, createdAt: string): Promise<IdempotencyClaim> {
    const existing = this.idempotency.get(key);
    if (!existing) {
      const token = randomUUID();
      const expiresAt = new Date(new Date(createdAt).getTime() + 300_000).toISOString();
      this.idempotency.set(key, { requestHash, token, expiresAt });
      return { outcome: "claimed", token };
    }
    if (existing.requestHash !== requestHash) return { outcome: "conflict" };
    if (!existing.response && existing.expiresAt <= createdAt) {
      const token = randomUUID();
      const expiresAt = new Date(new Date(createdAt).getTime() + 300_000).toISOString();
      this.idempotency.set(key, { requestHash, token, expiresAt });
      return { outcome: "claimed", token };
    }
    return existing.response ? { outcome: "replay", response: copy(existing.response) } : { outcome: "in-progress" };
  }
  async completeIdempotency(key: string, token: string, response: StoredHttpResponse) {
    const existing = this.idempotency.get(key);
    if (!existing || existing.token !== token) throw new Error("Idempotency claim is missing");
    existing.response = copy(response);
  }
  async abandonIdempotency(key: string, token: string) {
    const existing = this.idempotency.get(key);
    if (existing?.token === token && !existing.response) this.idempotency.delete(key);
  }
  async listExpiredEvidence(cutoff: string, limit: number) {
    return [...this.receipts.values()]
      .filter((record) => record.evidenceObject && record.evidenceObject.storedAt < cutoff)
      .sort((left, right) => left.evidenceObject!.storedAt.localeCompare(right.evidenceObject!.storedAt))
      .slice(0, limit)
      .map(copy);
  }
  async markEvidenceDeleted(receiptId: string, deletedAt: string) {
    const record = this.receipts.get(receiptId);
    if (!record) return;
    delete record.evidenceObject;
    record.evidenceDeletedAt = deletedAt;
  }
}

export class RepositoryConflictError extends Error {
  constructor(readonly conflict: "receipt-id") {
    super(`Repository conflict: ${conflict}`);
  }
}

export interface SqlClient {
  query<R extends QueryResultRow = any>(text: string, values?: readonly unknown[]): Promise<QueryResult<R>>;
}

interface ReceiptRow extends QueryResultRow {
  receipt_id: string; tenant_id: string; public_receipt: unknown; evidence_hash: string;
  evidence_object_uri: string | null; evidence_size_bytes: number | null;
  evidence_stored_at: Date | string | null; evidence_deleted_at: Date | string | null; created_at: Date | string;
}
interface DefenseRow extends QueryResultRow {
  defense_id: string; name: string; author_agent_id: string; created_at: Date | string;
}
interface VersionRow extends QueryResultRow {
  defense_version_id: string; defense_id: string; bundle: unknown; status: "candidate"; created_at: Date | string;
}
interface ReplayRow extends QueryResultRow {
  replay_id: string; tenant_id: string; request: unknown; status: ReplayJobRecord["status"];
  report: unknown | null; error_code: string | null; created_at: Date | string; updated_at: Date | string;
}
interface IdempotencyRow extends QueryResultRow {
  request_hash: string; claim_token: string; claim_expires_at: Date | string;
  response_status: number | null; response_body: unknown | null; response_headers: unknown | null;
}

function timestamp(value: Date | string): string {
  return value instanceof Date ? value.toISOString() : new Date(value).toISOString();
}

function receiptFromRow(row: ReceiptRow): ReceiptRecord {
  return {
    tenantId: row.tenant_id,
    receipt: threatReceiptSchema.parse(row.public_receipt),
    evidenceHash: row.evidence_hash,
    ...(row.evidence_object_uri && row.evidence_size_bytes !== null && row.evidence_stored_at ? {
      evidenceObject: {
        uri: row.evidence_object_uri,
        hash: row.evidence_hash,
        sizeBytes: row.evidence_size_bytes,
        storedAt: timestamp(row.evidence_stored_at),
      },
    } : {}),
    ...(row.evidence_deleted_at ? { evidenceDeletedAt: timestamp(row.evidence_deleted_at) } : {}),
    createdAt: timestamp(row.created_at),
  };
}

function defenseFromRow(row: DefenseRow): DefenseRecord {
  return { defenseId: row.defense_id, name: row.name, authorAgentId: row.author_agent_id, createdAt: timestamp(row.created_at) };
}

function versionFromRow(row: VersionRow): DefenseVersionRecord {
  return {
    defenseVersionId: row.defense_version_id,
    defenseId: row.defense_id,
    bundle: defenseBundleSchema.parse(row.bundle),
    status: row.status,
    createdAt: timestamp(row.created_at),
  };
}

function replayFromRow(row: ReplayRow): ReplayJobRecord {
  return {
    replayId: row.replay_id,
    tenantId: row.tenant_id,
    request: createReplayRequestSchema.parse(row.request),
    status: row.status,
    ...(row.report ? { report: replayReportSchema.parse(row.report) } : {}),
    ...(row.error_code ? { errorCode: row.error_code } : {}),
    createdAt: timestamp(row.created_at),
    updatedAt: timestamp(row.updated_at),
  };
}

export class PostgresControlPlaneRepository implements ControlPlaneRepository {
  constructor(private readonly database: SqlClient) {}

  async healthCheck(): Promise<void> {
    await this.database.query("SELECT 1");
  }

  async getReceipt(receiptId: string) {
    const result = await this.database.query<ReceiptRow>("SELECT * FROM threat_receipts WHERE receipt_id = $1", [receiptId]);
    return result.rows[0] ? receiptFromRow(result.rows[0]) : undefined;
  }

  async getReceiptForTenant(tenantId: string, receiptId: string) {
    const result = await this.database.query<ReceiptRow>(
      "SELECT * FROM threat_receipts WHERE tenant_id = $1 AND receipt_id = $2",
      [tenantId, receiptId],
    );
    return result.rows[0] ? receiptFromRow(result.rows[0]) : undefined;
  }

  async saveReceipt(record: ReceiptRecord): Promise<ReceiptSaveResult> {
    if (!record.evidenceObject) throw new Error("A persisted receipt requires an evidence object reference");
    try {
      const existing = await this.database.query<ReceiptRow>(
        "SELECT * FROM threat_receipts WHERE tenant_id = $1 AND deduplication_key = $2",
        [record.tenantId, record.receipt.deduplicationKey],
      );
      if (existing.rows[0]) return { created: false, record: receiptFromRow(existing.rows[0]) };
      const result = await this.database.query<ReceiptRow>(`
        INSERT INTO threat_receipts
          (receipt_id, tenant_id, deduplication_key, public_receipt, evidence_object_uri, evidence_hash,
           evidence_size_bytes, evidence_stored_at, created_at)
        VALUES ($1, $2, $3, $4::jsonb, $5, $6, $7, $8, $9)
        ON CONFLICT (tenant_id, deduplication_key) DO NOTHING
        RETURNING *`, [
        record.receipt.receiptId, record.tenantId, record.receipt.deduplicationKey,
        JSON.stringify(record.receipt), record.evidenceObject.uri, record.evidenceHash,
        record.evidenceObject.sizeBytes, record.evidenceObject.storedAt, record.createdAt,
      ]);
      if (result.rows[0]) return { created: true, record: receiptFromRow(result.rows[0]) };
      const duplicate = await this.database.query<ReceiptRow>(
        "SELECT * FROM threat_receipts WHERE tenant_id = $1 AND deduplication_key = $2",
        [record.tenantId, record.receipt.deduplicationKey],
      );
      if (!duplicate.rows[0]) throw new Error("Receipt deduplication conflict could not be resolved");
      return { created: false, record: receiptFromRow(duplicate.rows[0]) };
    } catch (error) {
      if ((error as { code?: string }).code === "23505") throw new RepositoryConflictError("receipt-id");
      throw error;
    }
  }

  async saveDefense(record: DefenseRecord) {
    const result = await this.database.query(`
      INSERT INTO defenses (defense_id, name, author_agent_id, created_at) VALUES ($1, $2, $3, $4)
      ON CONFLICT (defense_id) DO NOTHING RETURNING defense_id`,
    [record.defenseId, record.name, record.authorAgentId, record.createdAt]);
    return result.rowCount === 1;
  }

  async getDefense(defenseId: string) {
    const result = await this.database.query<DefenseRow>("SELECT * FROM defenses WHERE defense_id = $1", [defenseId]);
    return result.rows[0] ? defenseFromRow(result.rows[0]) : undefined;
  }

  async saveDefenseVersion(record: DefenseVersionRecord) {
    const result = await this.database.query(`
      INSERT INTO defense_versions (defense_version_id, defense_id, bundle, status, created_at)
      VALUES ($1, $2, $3::jsonb, $4, $5)
      ON CONFLICT (defense_version_id) DO NOTHING RETURNING defense_version_id`,
    [record.defenseVersionId, record.defenseId, JSON.stringify(record.bundle), record.status, record.createdAt]);
    return result.rowCount === 1;
  }

  async getDefenseVersion(defenseVersionId: string) {
    const result = await this.database.query<VersionRow>("SELECT * FROM defense_versions WHERE defense_version_id = $1", [defenseVersionId]);
    return result.rows[0] ? versionFromRow(result.rows[0]) : undefined;
  }

  async saveReplay(record: ReplayJobRecord) {
    await this.database.query(`
      INSERT INTO replay_runs (replay_id, tenant_id, request, status, report, error_code, created_at, updated_at)
      VALUES ($1, $2, $3::jsonb, $4, $5::jsonb, $6, $7, $8)
      ON CONFLICT (replay_id) DO UPDATE SET status = EXCLUDED.status, report = EXCLUDED.report,
        error_code = EXCLUDED.error_code, updated_at = EXCLUDED.updated_at`, [
      record.replayId, record.tenantId, JSON.stringify(record.request), record.status,
      record.report ? JSON.stringify(record.report) : null, record.errorCode ?? null, record.createdAt, record.updatedAt,
    ]);
  }

  async getReplay(replayId: string) {
    const result = await this.database.query<ReplayRow>("SELECT * FROM replay_runs WHERE replay_id = $1", [replayId]);
    return result.rows[0] ? replayFromRow(result.rows[0]) : undefined;
  }

  async claimNextReplay(updatedAt: string) {
    const result = await this.database.query<ReplayRow>(`
      UPDATE replay_runs SET status = 'running', updated_at = $1
      WHERE replay_id = (SELECT replay_id FROM replay_runs WHERE status = 'queued' ORDER BY created_at, replay_id LIMIT 1)
        AND status = 'queued'
      RETURNING *`, [updatedAt]);
    return result.rows[0] ? replayFromRow(result.rows[0]) : undefined;
  }

  async claimIdempotency(key: string, requestHash: string, createdAt: string): Promise<IdempotencyClaim> {
    const token = randomUUID();
    const expiresAt = new Date(new Date(createdAt).getTime() + 300_000).toISOString();
    const inserted = await this.database.query(`
      INSERT INTO idempotency_keys (storage_key, request_hash, claim_token, claim_expires_at, created_at)
      VALUES ($1, $2, $3, $4, $5)
      ON CONFLICT (storage_key) DO NOTHING RETURNING storage_key`, [key, requestHash, token, expiresAt, createdAt]);
    const result = await this.database.query<IdempotencyRow>("SELECT * FROM idempotency_keys WHERE storage_key = $1", [key]);
    const existing = result.rows[0];
    if (!existing) throw new Error("Idempotency claim could not be resolved");
    if (existing.claim_token === token && inserted.rowCount === 1) return { outcome: "claimed", token };
    if (existing.request_hash !== requestHash) return { outcome: "conflict" };
    if (existing.response_status === null) {
      if (timestamp(existing.claim_expires_at) <= createdAt) {
        const reclaimed = await this.database.query<IdempotencyRow>(`
          UPDATE idempotency_keys SET request_hash = $2, claim_token = $3, claim_expires_at = $4, created_at = $5
          WHERE storage_key = $1 AND response_status IS NULL AND claim_expires_at <= $5 RETURNING *`,
        [key, requestHash, token, expiresAt, createdAt]);
        if (reclaimed.rows[0]?.claim_token === token) return { outcome: "claimed", token };
      }
      return { outcome: "in-progress" };
    }
    const headers = existing.response_headers;
    if (!headers || typeof headers !== "object" || Array.isArray(headers)) throw new Error("Invalid stored response headers");
    return {
      outcome: "replay",
      response: {
        requestHash: existing.request_hash,
        status: existing.response_status,
        body: existing.response_body,
        headers: headers as Record<string, string>,
      },
    };
  }

  async completeIdempotency(key: string, token: string, response: StoredHttpResponse, completedAt: string) {
    const result = await this.database.query(`
      UPDATE idempotency_keys SET response_status = $3, response_body = $4::jsonb,
        response_headers = $5::jsonb, completed_at = $6
      WHERE storage_key = $1 AND claim_token = $2 AND response_status IS NULL`, [
      key, token, response.status, JSON.stringify(response.body), JSON.stringify(response.headers), completedAt,
    ]);
    if (result.rowCount !== 1) throw new Error("Idempotency claim completion failed");
  }

  async abandonIdempotency(key: string, token: string) {
    await this.database.query("DELETE FROM idempotency_keys WHERE storage_key = $1 AND claim_token = $2 AND response_status IS NULL", [key, token]);
  }

  async listExpiredEvidence(cutoff: string, limit: number) {
    const result = await this.database.query<ReceiptRow>(`
      SELECT * FROM threat_receipts WHERE evidence_object_uri IS NOT NULL AND evidence_stored_at < $1
      ORDER BY evidence_stored_at, receipt_id LIMIT $2`, [cutoff, limit]);
    return result.rows.map(receiptFromRow);
  }

  async markEvidenceDeleted(receiptId: string, deletedAt: string) {
    await this.database.query(`
      UPDATE threat_receipts SET evidence_object_uri = NULL, evidence_size_bytes = NULL,
        evidence_stored_at = NULL, evidence_deleted_at = $2 WHERE receipt_id = $1`, [receiptId, deletedAt]);
  }
}
