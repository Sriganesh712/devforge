// DevForge ESLint flat config
// Lints JavaScript files with essential rules.
// TypeScript files are type-checked by `pnpm typecheck` (tsc --noEmit).

module.exports = [
  {
    files: ['**/*.{js,mjs,cjs}'],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
    },
    rules: {
      // Possible errors
      'no-undef': 'error',
      'no-unreachable': 'error',
      'no-unused-expressions': 'error',
      // Best practices
      'no-console': 'warn',
      'no-debugger': 'warn',
      'no-alert': 'error',
      'no-eval': 'error',
      'no-implied-eval': 'error',
      'no-new-wrappers': 'error',
      'no-octal': 'error',
      'no-octal-escape': 'error',
      'no-script-url': 'error',
      'no-throw-literal': 'error',
      // Strict mode
      'strict': ['error', 'safe'],
      // Variables
      'no-catch-shadow': 'error',
      'no-delete-var': 'error',
      'no-label-var': 'error',
      'no-shadow-restricted-names': 'error',
      'no-undef-init': 'error',
      'no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
      // Style
      'prefer-const': 'error',
      'no-var': 'error',
      'eqeqeq': ['error', 'always'],
      'curly': ['error', 'all'],
    },
  },
  {
    ignores: [
      'node_modules/**',
      '.next/**',
      'apps/web/**',
      'coverage/**',
      'dist/**',
      'out/**',
      'playwright-report/**',
      'test-results/**',
      '*.config.ts',
      'playwright.config.ts',
      'next.config.ts',
      'vitest.config.ts',
      'eslint.config.cjs',
    ],
  },
];
