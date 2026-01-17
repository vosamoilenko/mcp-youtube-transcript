import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: false,
    environment: 'node',
    testTimeout: 30000,
    hookTimeout: 30000,
    include: ['test/**/*.test.js'],
    exclude: ['node_modules', 'dist'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/**',
        'test/**',
        'scripts/**',
        'vitest.config.js'
      ]
    }
  }
});
