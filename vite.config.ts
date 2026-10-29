import { defineConfig } from 'vite';
import preact from '@preact/preset-vite';

export default defineConfig({
  plugins: [
    preact(),
  ],
  root: '.',
  build: {
    outDir: 'dist/client',
    assetsDir: 'assets',
    emptyOutDir: true,
    rollupOptions: {
      input: {
        main: './index.html',
      },
    },
  },
  server: {
    port: 8788,
  },
  resolve: {
    alias: {
      '@': '/src',
    },
  },
});