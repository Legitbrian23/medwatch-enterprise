module.exports = {
  root: true,
  parser: '@typescript-eslint/parser',
  plugins: ['@typescript-eslint'],
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
    'prettier',
  ],
  env: { node: true, es2022: true },
  rules: {
    '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
    '@typescript-eslint/no-explicit-any': 'error',

    // ── No icon library imports (design-system.md §2) ──────────────────────
    // Blocks lucide-react, @heroicons/*, react-icons, phosphor-react,
    // tabler-icons-react, @radix-ui/react-icons, and any package whose
    // name contains the word "icon".
    'no-restricted-imports': [
      'error',
      {
        patterns: [
          {
            group: ['lucide-react'],
            message: 'Icon libraries are forbidden. Use text labels per design-system.md §2.',
          },
          {
            group: ['@heroicons/*'],
            message: 'Icon libraries are forbidden. Use text labels per design-system.md §2.',
          },
          {
            group: ['react-icons', 'react-icons/*'],
            message: 'Icon libraries are forbidden. Use text labels per design-system.md §2.',
          },
          {
            group: ['phosphor-react'],
            message: 'Icon libraries are forbidden. Use text labels per design-system.md §2.',
          },
          {
            group: ['tabler-icons-react'],
            message: 'Icon libraries are forbidden. Use text labels per design-system.md §2.',
          },
          {
            group: ['@radix-ui/react-icons'],
            message: 'Icon libraries are forbidden. Use text labels per design-system.md §2.',
          },
          {
            // catch-all: any package whose name contains "icon"
            group: ['*icon*', '*icons*'],
            message: 'Icon libraries are forbidden. Use text labels per design-system.md §2.',
          },
        ],
      },
    ],
  },
};
