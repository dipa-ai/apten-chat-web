import '@testing-library/jest-dom/vitest';
import { afterEach } from 'vitest';
import { cleanup } from '@testing-library/react';

// With globals: false, Testing Library can't auto-register its afterEach
// cleanup, so unmount rendered trees between tests explicitly.
afterEach(() => {
  cleanup();
});
