/// <reference types="vitest" />
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'happy-dom',
    setupFiles: ['./src/test/setup.ts'],
    // Explicitly include only src directory tests to avoid node_modules
    include: ['src/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}'],
    exclude: [
      'node_modules/**',
      '**/node_modules/**',
      'dist/**',
      '.next/**',
      'coverage/**',
      '**/*.d.ts',
    ],
    // Optimize memory usage - one worker at a time. vitest 4 removed
    // poolOptions/Tinypool; singleThread/maxThreads collapse into maxWorkers.
    // Threads (not the new 'forks' default) so the --max-old-space-size in the
    // test script governs one shared heap.
    pool: 'threads',
    maxWorkers: 1,
    // Increase timeout and reduce memory pressure
    testTimeout: 10000,
    teardownTimeout: 5000,
    // Reduce memory consumption
    logHeapUsage: false,
    isolate: true,
    // Disable file watching and other memory-intensive features
    watch: false,
    // Disable inline snapshots to reduce memory
    snapshotFormat: {
      printBasicPrototype: false,
    },
    // Coverage configuration to avoid scanning node_modules.
    // lcov is not in vitest's default reporter set, and it is what the
    // Codecov step in ci.yml uploads.
    coverage: {
      reporter: ['text', 'lcov'],
      exclude: [
        'node_modules/**',
        '**/node_modules/**',
        'dist/**',
        '.next/**',
        'coverage/**',
        '**/*.d.ts',
        '**/*.config.{js,ts,mjs,mts}',
      ],
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
    conditions: ['browser'],
  },
  ssr: {
    resolve: {
      conditions: ['browser'],
    },
  },
});
