import { resolve } from "node:path";
import { Pool } from "pg";
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
const service = new ControlPlaneService(repository, undefined, undefined, objectStore);
const authenticator = new StaticApiKeyAuthenticator([{
  token: apiKey,
  principal: {
    subject: "local-agent",
    tenantId: "local-tenant",
    scopes: ["receipts:write", "defenses:write", "replays:write"],
  },
}]);
const server = createControlPlaneServer(new ControlPlaneHttpApp(service, authenticator));

server.listen(port, "127.0.0.1", () => {
  console.log(`Dadieng control plane listening on http://127.0.0.1:${port}`);
});

async function shutdown() {
  server.close();
  await pool.end();
}
process.once("SIGINT", () => { void shutdown(); });
process.once("SIGTERM", () => { void shutdown(); });
