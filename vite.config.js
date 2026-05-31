import { defineConfig } from 'vite';
import { copyFileSync, mkdirSync, existsSync } from 'fs';

// Plugin para copiar archivos raíz al dist después del build
function copyRootFiles() {
  return {
    name: 'copy-root-files',
    closeBundle() {
      const files = [
        ['index.html',       'dist/index.html'],
        ['manifest.json',    'dist/manifest.json'],
        ['sw.js',            'dist/sw.js'],
        ['privacidad.html',  'dist/privacidad.html'],
        ['terminos.html',    'dist/terminos.html'],
        ['_redirects',       'dist/_redirects'],
      ];
      for (const [src, dst] of files) {
        try { copyFileSync(src, dst); } catch(e) {}
      }
    }
  };
}

export default defineConfig({
  root: 'app',
  publicDir: '../assets',
  base: '/app/',
  build: {
    outDir: '../dist/app',
    emptyOutDir: true,
  },
  plugins: [copyRootFiles()],
  server: {
    port: 3000,
  },
});
