import js from '@eslint/js';
import globals from 'globals';

// Flat config. Serverseitiger Node-Code (src/, test/, root config) wird gelintet.
// Der Vanilla-Browser-Code in public/ bleibt vorerst außen vor (kommt bei der
// vollen Härtung nach dem Event dazu).
export default [
  js.configs.recommended,
  {
    files: ['**/*.js'],
    languageOptions: {
      ecmaVersion: 2023,
      sourceType: 'module',
      globals: globals.node,
    },
    rules: {
      'no-unused-vars': ['warn', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
    },
  },
  {
    ignores: [
      'node_modules/**',
      'data/**',
      'public/**',
      'docs/**',
      'Foto-Challenge Party App/**',
    ],
  },
];
