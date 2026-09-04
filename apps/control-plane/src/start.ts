import { resolve } from "node:path";
import { randomUUID } from "node:crypto";
import { Pool } from "pg";
import {
  ChainOperationCoordinator,
  createViemMonadTransactionAdapter,
  type DadiengContractAddresses,
} from "@dadieng/contracts-client";
import { StaticApiKeyAuthenticator } from "./auth.js";
import { ControlPlaneHttpApp } from "./http.js";
import { migratePostgres } from "./migrations.js";
import { FileSystemPrivateObjectStore } from "./object-store.js";
import { PostgresControlPlaneRepository } from "./repository.js";
import { createControlPlaneServer } from "./server.js";
import { ControlPlaneService } from "./service.js";

const apiKey = process.env.DADIENG_API_KEY;
const databaseUrl = process.env.DATABASE_URL;
const objectRoot = process.env.DADIENG_OBJECT_ROOT;
if (!apiKey) throw new Error("DADIENG_API_KEY is required");
if (!databaseUrl) throw new Error("DATABASE_URL is required");
if (!objectRoot) throw new Error("DADIENG_OBJECT_ROOT is required");
const port = Number.parseInt(process.env.PORT ?? "3001", 10);
if (!Number.isInteger(port) || port < 1 || port > 65_535) throw new Error("PORT must be between 1 and 65535");

const pool = new Pool({
  connectionString: databaseUrl,
  ...(process.env.DATABASE_SSL === "require" ? { ssl: { rejectUnauthorized: true } } : {}),
});
await migratePostgres(pool);
const repository = new PostgresControlPlaneRepository(pool);
const objectStore = new FileSystemPrivateObjectStore(resolve(objectRoot));
const chainEnvironment = {
  rpcUrl: process.env.MONAD_RPC_URL,
  privateKey: process.env.MONAD_PRIVATE_KEY,
  registry: process.env.DADIENG_REGISTRY_ADDRESS,
  validation: process.env.DADIENG_VALIDATION_ADDRESS,
  rewards: process.env.DADIENG_REWARDS_ADDRESS,
  agentId: process.env.DADIENG_ERC8004_AGENT_ID,
};
const configuredChainValues = Object.values(chainEnvironment).filter(Boolean).length;
if (configuredChainValues !== 0 && configuredChainValues !== Object.keys(chainEnvironment).length) {
  throw new Error("Monad transaction configuration must provide the RPC URL, private key, contract addresses, and ERC-8004 agent ID");
}
if (chainEnvironment.agentId && !/^[1-9]\d*$/.test(chainEnvironment.agentId)) {
  throw new Error("DADIENG_ERC8004_AGENT_ID must be a positive decimal integer");
}
const chainOperations = configuredChainValues === Object.keys(chainEnvironment).length
  ? new ChainOperationCoordinator(
      repository,
      createViemMonadTransactionAdapter({
        rpcUrl: chainEnvironment.rpcUrl!,
        privateKey: chainEnvironment.privateKey! as `0x${string}`,
        registry: chainEnvironment.registry! as DadiengContractAddresses["registry"],
        validation: chainEnvironment.validation! as DadiengContractAddresses["validation"],
        rewards: chainEnvironment.rewards! as DadiengContractAddresses["rewards"],
        requiredConfirmations: (() => {
          const value = process.env.DADIENG_CHAIN_CONFIRMATIONS ?? "2";
          if (!/^[1-9]\d*$/.test(value)) throw new Error("DADIENG_CHAIN_CONFIRMATIONS must be a positive integer");
          return Number(value);
        })(),
      }),
      { createId: randomUUID, now: () => new Date().toISOString() },
    )
  : undefined;
const service = new ControlPlaneService(
  repository,
  undefined,
  undefined,
  objectStore,
  chainOperations,
  chainOperations ? (principal) => principal.subject === "local-agent" ? chainEnvironment.agentId : undefined : undefined,
);
const authenticator = new StaticApiKeyAuthenticator([{
  token: apiKey,
  principal: {
    subject: "local-agent",
    tenantId: "local-tenant",
    scopes: ["receipts:write", "defenses:write", "replays:write"],
  },
}]);
const server = createControlPlaneServer(new ControlPlaneHttpApp(service, authenticator));

let chainWorkerRunning = false;
const chainWorker = chainOperations ? setInterval(() => {
  if (chainWorkerRunning) return;
  chainWorkerRunning = true;
  void service.runNextChainOperation()
    .catch(() => console.error("Dadieng chain worker iteration failed"))
    .finally(() => { chainWorkerRunning = false; });
}, 1_000) : undefined;

server.listen(port, "127.0.0.1", () => {
  console.log(`Dadieng control plane listening on http://127.0.0.1:${port}`);
});

async function shutdown() {
  if (chainWorker) clearInterval(chainWorker);
  server.close();
  await pool.end();
}
process.once("SIGINT", () => { void shutdown(); });
process.once("SIGTERM", () => { void shutdown(); });
