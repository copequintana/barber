import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: { tsconfigPaths: true },
  test: {
    environment: "node",
    setupFiles: ["dotenv/config"],
    include: ["src/**/*.test.ts", "tests/**/*.test.ts"],
    // Los tests de BD comparten el contenedor de Postgres: sin paralelismo
    // entre archivos para que no se pisen los datos.
    fileParallelism: false,
    testTimeout: 20000,
  },
});
