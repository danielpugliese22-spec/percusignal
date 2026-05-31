import { defineConfig } from 'vite';

export default defineConfig({
  root: 'app',
  publicDir: '../assets',
  base: '/app/',
  build: {
    outDir: '../dist/app',
    emptyOutDir: true,
  },
  server: {
    port: 3000,
  },
});
