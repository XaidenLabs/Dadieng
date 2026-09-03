import { StaticApiKeyAuthenticator } from "./auth.js";
import { ControlPlaneHttpApp } from "./http.js";
import { InMemoryControlPlaneRepository } from "./repository.js";
import { createControlPlaneServer } from "./server.js";
import { ControlPlaneService } from "./service.js";

const apiKey = process.env.DADIENG_API_KEY;
if (!apiKey) throw new Error("DADIENG_API_KEY is required");
const port = Number.parseInt(process.env.PORT ?? "3001", 10);
if (!Number.isInteger(port) || port < 1 || port > 65_535) throw new Error("PORT must be between 1 and 65535");

const repository = new InMemoryControlPlaneRepository();
const service = new ControlPlaneService(repository);
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
