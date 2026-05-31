import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

// Test-only config, kept separate from vite.config.ts so the production build
// is unaffected. Tests are transpiled by esbuild (not type-checked) and run in
// jsdom; component tests use Testing Library with the jest-dom matchers wired
// up in src/test/setup.ts.
export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    include: ['src/**/*.test.{ts,tsx}'],
  },
});
