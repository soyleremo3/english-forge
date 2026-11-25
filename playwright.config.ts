import { defineConfig, devices } from "@playwright/test";
import { loadLocalEnv } from "./scripts/load-env";

// Uçtan uca testler (SPEC 13). Yalnızca TEST kullanıcısıyla çalışır; gerçek hesaba dokunmaz.
//
//   npm run test:e2e
//
// Giriş bilgileri .env.local'dan okunur:
//   E2E_EMAIL     (boşsa ALLOWED_EMAILS içindeki "+test" adresi)
//   E2E_PASSWORD  (boşsa giriş gerektiren testler atlanır)
// Testler kendi production sunucusunu 3100 portunda açar; çalışan `npm run dev`i etkilemez.
// Telefondan erişimi taklit etmek için: E2E_HOST=<bilgisayar IP> (ör. 172.20.10.4) → testler o adrese gider.

loadLocalEnv();

const PORT = 3100;
const HOST = process.env.E2E_HOST || "localhost";

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: [["list"]],
  use: {
    baseURL: `http://${HOST}:${PORT}`,
    trace: "retain-on-failure",
  },
  projects: [
    { name: "masaüstü-chromium", use: { ...devices["Desktop Chrome"] } },
    { name: "iphone-safari", use: { ...devices["iPhone 14"] } },
  ],
  webServer: {
    command: `npx next build && npx next start -p ${PORT}`,
    url: `http://${HOST}:${PORT}/login`,
    timeout: 300_000,
    reuseExistingServer: false,
  },
});
