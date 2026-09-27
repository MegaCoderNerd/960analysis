import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['aar/eval.test.ts'],
    disableConsoleIntercept: true,
  },
});
