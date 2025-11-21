/// <reference types="vitest" />
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
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
    // Optimize memory usage - use forks instead of threads
    pool: 'forks',
    poolOptions: {
      forks: {
        singleFork: true,
        maxForks: 1,
        minForks: 1,
      },
    },
    // Increase timeout and reduce memory pressure
    testTimeout: 10000,
    teardownTimeout: 5000,
    // Reduce memory consumption
    logHeapUsage: false,
    isolate: false,
    // Disable file watching and other memory-intensive features
    watch: false,
    // Disable inline snapshots to reduce memory
    snapshotFormat: {
      printBasicPrototype: false,
    },
    // Coverage configuration to avoid scanning node_modules
    coverage: {
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
  },
});
