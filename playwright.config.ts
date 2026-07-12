import { defineConfig, devices } from "@playwright/test";
import { assertStagingEnvironment, getE2EConfig } from "./tests/e2e/support/env";

const e2e = getE2EConfig();
assertStagingEnvironment(e2e);

export default defineConfig({
  testDir: "./tests/e2e/specs",
  timeout: 60_000,
  expect: { timeout: 10_000 },
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: process.env.CI ? 2 : 1,
  reporter: [
    ["list"],
    ["html", { outputFolder: "playwright-report", open: "never" }],
    ["junit", { outputFile: "test-results/e2e-junit.xml" }],
  ],
  use: {
    baseURL: e2e.customerUrl,
    extraHTTPHeaders: {
      "x-miclub-staging-e2e": "true",
      ...(e2e.vercelBypassSecret
        ? {
            "x-vercel-protection-bypass": e2e.vercelBypassSecret,
            "x-vercel-set-bypass-cookie": "true",
          }
        : {}),
    },
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
    actionTimeout: 15_000,
    navigationTimeout: 30_000,
  },
  outputDir: "test-results/playwright-artifacts",
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
    {
      name: "chromium-desktop",
      use: { ...devices["Desktop Chrome"], viewport: { width: 1440, height: 900 } },
    },
    {
      name: "chromium-mobile",
      use: { ...devices["Pixel 7"] },
    },
  ],
});
