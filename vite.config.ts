import { defineConfig } from 'vite';
import preact from '@preact/preset-vite';
import { cloudflare } from '@cloudflare/vite-plugin';

export default defineConfig({
  plugins: [
    preact(),
    cloudflare({
      viteEnvironment: { name: 'ssr' },
    }),
  ],
  build: {
    outDir: 'dist/client',
    emptyOutDir: true,
    ssr: true,
    rollupOptions: {
      input: {
        client: './src/client/entry-client.tsx',
      },
    },
  },
  server: {
    port: 8788,
  },
});