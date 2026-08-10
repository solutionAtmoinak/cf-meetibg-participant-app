import { defineConfig } from '@playwright/test';

const MOCK_WORKER_PORT = 4502;
const FRONTEND_PORT = 5184;

export default defineConfig({
  testDir: './e2e',
  timeout: 30_000,
  use: {
    baseURL: `http://localhost:${FRONTEND_PORT}`,
  },
  webServer: [
    {
      command: 'node e2e/mock-worker.mjs',
      port: MOCK_WORKER_PORT,
      env: { MOCK_WORKER_PORT: String(MOCK_WORKER_PORT) },
      reuseExistingServer: false,
    },
    {
      command: `npx vite --port ${FRONTEND_PORT}`,
      port: FRONTEND_PORT,
      env: { VITE_BACKEND_URL: `http://localhost:${MOCK_WORKER_PORT}` },
      reuseExistingServer: false,
    },
  ],
});
