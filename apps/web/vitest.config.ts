import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  resolve: {
    // When an import ends in .js, also try .ts / .tsx so ESM source imports work
    extensions: ['.ts', '.tsx', '.js', '.jsx'],
  },
  test: {
    environment: 'node',
    include: ['src/test/**/*.test.ts'],
  },
});
