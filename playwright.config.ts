import { defineConfig } from '@playwright/test';

const testUmgebung = {
  E2E_OHNE_LOGIN: '1',
  SUCH_CACHE: 'speicher',
  NEXT_PUBLIC_SUPABASE_URL: 'https://test.supabase.co',
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: 'sb_publishable_test_1234567890',
  SUPABASE_SECRET_KEY: 'sb_secret_test_12345678901234567',
  ERLAUBTE_EMAILS: 'test@example.de',
  BA_JOBS_URL: 'http://localhost:4010/ba-jobs',
  BA_STUDIUM_URL: 'http://localhost:4010/ba-studium',
};

export default defineConfig({
  testDir: 'e2e',
  timeout: 60_000,
  expect: { timeout: 10_000 },
  fullyParallel: false,
  workers: 1,
  reporter: [['list']],
  use: { baseURL: 'http://localhost:3100', browserName: 'chromium' },
  projects: [
    { name: 'iphone', use: { viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true } },
    { name: 'desktop', use: { viewport: { width: 1280, height: 800 } } },
  ],
  webServer: [
    {
      command: 'npx next dev -p 3100',
      url: 'http://localhost:3100/',
      env: testUmgebung,
      reuseExistingServer: !process.env.CI,
      timeout: 180_000,
    },
  ],
});
