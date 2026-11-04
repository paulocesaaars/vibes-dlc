import nextCoreWebVitals from 'eslint-config-next/core-web-vitals';
import nextTypescript from 'eslint-config-next/typescript';

const eslintConfig = [
  {
    ignores: [
      '.next/**',
      'node_modules/**',
      'aidlc/**',
      'design/**',
      '.claude/**',
      '.agents/**',
      '.codex/**',
      '.cursor/**',
      '.vscode/**',
      'public/**',
      'next-env.d.ts',
      'tests/fixtures/**',
    ],
  },
  ...nextCoreWebVitals,
  ...nextTypescript,
];

export default eslintConfig;
