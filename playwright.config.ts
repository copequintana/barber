import { defineConfig, devices } from "@playwright/test";

/**
 * E2E contra el build de producción local (requiere el Postgres de dev con
 * seed). `npm run test:e2e` compila, levanta el servidor y corre los specs.
 */
export default defineConfig({
  testDir: "./tests/e2e",
  globalSetup: "./tests/e2e/global-setup.ts",
  timeout: 60_000,
  retries: 0,
  use: {
    baseURL: "http://localhost:3100",
    trace: "retain-on-failure",
  },
  projects: [
    { name: "chromium", use: { ...devices["Desktop Chrome"] } },
    {
      name: "mobile",
      // Viewport de teléfono sin isMobile/hasTouch: la emulación táctil de
      // Chromium headless desplaza los taps en contenedores con scroll
      // horizontal (los clics caían en el botón vecino de la tira de fechas).
      use: {
        ...devices["Desktop Chrome"],
        viewport: { width: 412, height: 915 },
      },
    },
  ],
  webServer: {
    command: "npx next start -p 3100",
    url: "http://localhost:3100",
    reuseExistingServer: true,
    timeout: 60_000,
    stdout: "pipe",
    stderr: "pipe",
  },
});
