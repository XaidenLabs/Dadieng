import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

export default defineConfig({
  resolve: {
    alias: {
      "@dadieng/schemas": fileURLToPath(new URL("./packages/schemas/src/index.ts", import.meta.url)),
      "@dadieng/policy-engine": fileURLToPath(new URL("./packages/policy-engine/src/index.ts", import.meta.url)),
      "@dadieng/receipt-sanitizer": fileURLToPath(new URL("./packages/receipt-sanitizer/src/index.ts", import.meta.url)),
      "@dadieng/sdk": fileURLToPath(new URL("./packages/sdk/src/index.ts", import.meta.url)),
    },
  },
  test: {
    include: ["tests/**/*.test.ts"],
    coverage: {
      reporter: ["text", "html"],
    },
  },
});
