import { defineConfig } from '@playwright/test';
export default defineConfig({
  testDir: './tests/e2e',
  timeout: 60000,
  expect: { timeout: 15000 },
  use: { channel: 'chrome', baseURL: 'http://127.0.0.1:5183' },
  webServer: [
    {
      command: 'npm run dev -- --port 5183 --strictPort',
      url: 'http://127.0.0.1:5183',
      reuseExistingServer: false,
    },
    {
      command: 'npm run preview -- --port 5184 --strictPort',
      url: 'http://127.0.0.1:5184',
      reuseExistingServer: false,
    },
  ],
});
