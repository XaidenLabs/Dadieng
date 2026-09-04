import { contentHash, verifyDefenseBundle } from "@dadieng/defense-module";
import { defenseVersionKey, sha256Commitment } from "@dadieng/contracts-client";
import {
  DADIENG_MANIFEST_SCHEMA_VERSION,
  stableManifestSchema,
  stableManifestSigningMessage,
  type StableManifest,
} from "@dadieng/schemas";
import {
  createPublicClient,
  defineChain,
  http,
  parseAbi,
  type Address,
  type Hex,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";
import type { ControlPlaneRepository, StableManifestRecord } from "./repository.js";

export interface StableVersionState {
  status: number;
  manifestHash: Hex;
  artifactHash: Hex;
}

export interface StableVersionReader {
  getCode(address: Address): Promise<Hex | undefined>;
  getVersion(registry: Address, versionKey: Hex): Promise<StableVersionState>;
}

const registryAbi = parseAbi([
  "function getVersion(bytes32 key) view returns ((bytes32 defenseId,uint64 major,uint64 minor,uint64 patch,bytes32 manifestHash,bytes32 artifactHash,string manifestURI,uint256 authorAgentId,uint8 status,uint64 createdAt,bytes32 supersedes,bytes32 replayReportHash,string replayReportURI,uint32 attackPassed,uint32 attackTotal,uint32 controlPassed,uint32 controlTotal))",
]);

export function createStableVersionReader(rpcUrl: string, chainId: number): StableVersionReader {
  const chain = defineChain({
    id: chainId,
    name: chainId === 10_143 ? "Monad Testnet" : `Dadieng chain ${chainId}`,
    nativeCurrency: { name: "Monad", symbol: "MON", decimals: 18 },
    rpcUrls: { default: { http: [rpcUrl] } },
  });
  const client = createPublicClient({ chain, transport: http(rpcUrl, { retryCount: 0, timeout: 10_000 }) });
  return {
    getCode: (address) => client.getCode({ address }),
    async getVersion(registry, versionKey) {
      const version = await client.readContract({ address: registry, abi: registryAbi, functionName: "getVersion", args: [versionKey] });
      return { status: version.status, manifestHash: version.manifestHash, artifactHash: version.artifactHash };
    },
  };
}

export interface StableManifestPublisherConfig {
  chainId: number;
  registryAddress: Address;
  publicBaseUrl: string;
  privateKey: Hex;
  ttlSeconds?: number;
}

export interface StableManifestRuntime {
  now(): string;
}

export class StableManifestPublisher {
  readonly signerAddress: Address;
  private readonly account;
  private readonly ttlSeconds: number;

  constructor(
    private readonly repository: ControlPlaneRepository,
    private readonly reader: StableVersionReader,
    private readonly config: StableManifestPublisherConfig,
    private readonly runtime: StableManifestRuntime = { now: () => new Date().toISOString() },
  ) {
    if (!/^https?:\/\//.test(config.publicBaseUrl)) throw new Error("Manifest publicBaseUrl must use HTTP or HTTPS");
    this.ttlSeconds = config.ttlSeconds ?? 300;
    if (!Number.isInteger(this.ttlSeconds) || this.ttlSeconds < 60 || this.ttlSeconds > 86_400) {
      throw new Error("Manifest TTL must be between 60 and 86400 seconds");
    }
    this.account = privateKeyToAccount(config.privateKey);
    this.signerAddress = this.account.address;
  }

  async get(channel: string): Promise<StableManifestRecord> {
    if (channel !== "stable") throw new Error("Only the stable channel is available");
    const now = this.runtime.now();
    const latest = await this.repository.getLatestStableManifest(channel);
    if (latest && Date.parse(latest.manifest.expiresAt) > Date.parse(now)) return latest;

    const registryCode = await this.reader.getCode(this.config.registryAddress);
    if (!registryCode || registryCode === "0x") throw new Error("Dadieng Registry is not deployed");
    const storedVersions = await this.repository.listDefenseVersions();
    const stable = [] as StableManifest["versions"];
    for (const stored of storedVersions) {
      const bundle = verifyDefenseBundle(stored.bundle);
      const versionKey = defenseVersionKey(bundle.manifest.defenseId, bundle.manifest.version);
      const state = await this.reader.getVersion(this.config.registryAddress, versionKey);
      if (state.status !== 3) continue;
      if (state.manifestHash.toLowerCase() !== sha256Commitment(bundle.manifestHash).toLowerCase()
        || state.artifactHash.toLowerCase() !== sha256Commitment(bundle.manifest.artifactHash).toLowerCase()) {
        throw new Error(`Stable Monad commitment mismatch for ${stored.defenseVersionId}`);
      }
      stable.push({
        defenseId: bundle.manifest.defenseId,
        version: bundle.manifest.version,
        artifactHash: bundle.manifest.artifactHash,
        artifactUri: new URL(
          `/v1/defense-versions/${encodeURIComponent(stored.defenseVersionId)}/bundle`,
          this.config.publicBaseUrl,
        ).toString(),
        status: "stable",
      });
    }
    stable.sort((left, right) => left.defenseId.localeCompare(right.defenseId) || left.version.localeCompare(right.version));
    const unsigned: Omit<StableManifest, "signature"> = {
      schemaVersion: DADIENG_MANIFEST_SCHEMA_VERSION,
      channel,
      generatedAt: now,
      expiresAt: new Date(Date.parse(now) + this.ttlSeconds * 1_000).toISOString(),
      chainId: this.config.chainId,
      registryAddress: this.config.registryAddress,
      versions: stable,
      previousManifestHash: latest?.manifestHash ?? null,
    };
    const signature = await this.account.signMessage({ message: stableManifestSigningMessage(unsigned) });
    const manifest = stableManifestSchema.parse({ ...unsigned, signature });
    const record = { manifestHash: contentHash(manifest), manifest, createdAt: now };
    if (await this.repository.saveStableManifest(record)) return record;
    const concurrent = await this.repository.getLatestStableManifest(channel);
    if (!concurrent) throw new Error("Stable manifest continuity conflict");
    return concurrent;
  }
}
