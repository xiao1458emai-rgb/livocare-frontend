import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { copyFileSync } from 'fs';
import { resolve } from 'path';

export default defineConfig({
  plugins: [
    react(),
    {
      name: 'copy-redirects',
      closeBundle() {
        copyFileSync(
          resolve(__dirname, 'public/_redirects'),
          resolve(__dirname, 'dist/_redirects')
        );
      }
    }
  ],
  server: {
    host: true,
    port: 5173,
  },
  build: {
    outDir: 'dist',
  },
});