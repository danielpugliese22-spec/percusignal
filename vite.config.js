import { defineConfig } from 'vite';
import { copyFileSync, mkdirSync } from 'fs';

function copyRootFiles() {
  return {
    name: 'copy-root-files',
    closeBundle() {
      // Copiar archivos de la raíz del repo a dist/
      const rootFiles = [
        ['index.html',      'dist/index.html'],
        ['manifest.json',   'dist/manifest.json'],
        ['sw.js',           'dist/sw.js'],
        ['privacidad.html', 'dist/privacidad.html'],
        ['terminos.html',   'dist/terminos.html'],
        ['_redirects',      'dist/_redirects'],
      ];
      for (const [src, dst] of rootFiles) {
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
  server: { port: 3000 },
});
