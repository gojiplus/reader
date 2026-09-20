import { FlatCompat } from '@eslint/eslintrc';
import prettierConfig from 'eslint-config-prettier/flat';
import { dirname } from 'path';
import { fileURLToPath } from 'url';

const currentDirectory = dirname(fileURLToPath(import.meta.url));
const compat = new FlatCompat({ baseDirectory: currentDirectory });

const eslintConfig = [
  ...compat.extends('next/core-web-vitals', 'next/typescript'),
  prettierConfig,
  {
    rules: {
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
    },
  },
  {
    files: ['**/*.test.{ts,tsx}', '**/*.spec.{ts,tsx}'],
    rules: {
      '@typescript-eslint/no-explicit-any': 'off',
    },
  },
  {
    ignores: ['.next/**', 'coverage/**', 'out/**', 'build/**', 'next-env.d.ts', '.genkit/**'],
  },
];

export default eslintConfig;
