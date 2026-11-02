import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  resolve: { alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) } },
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts', 'tests/**/*.test.ts'],
    exclude: process.env.VERTRAG ? ['node_modules/**', 'e2e/**'] : ['node_modules/**', 'e2e/**', 'tests/vertrag/**'],
  },
});
