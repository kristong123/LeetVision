import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { crx } from '@crxjs/vite-plugin';
import manifest from './src/manifest.json';
import path from 'path';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react(), crx({ manifest })],
  base: './', // Use relative paths for browser extension
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  build: {
    rollupOptions: {
      input: {
        popup: 'index.html',
      },
    },
  },
});

