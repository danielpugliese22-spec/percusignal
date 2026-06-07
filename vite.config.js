import { defineConfig } from 'vite';
import { copyFileSync, mkdirSync, readFileSync } from 'fs';
import { resolve } from 'path';

function serveLanding() {
  return {
    name: 'serve-landing',
    configureServer(server) {
      const handler = (req, res, next) => {
        if (req.url === '/app' || req.url === '/app?') {
          res.writeHead(301, { Location: '/app/' });
          res.end();
          return;
        }
        const staticPages = {
          '/':             'index.html',
          '/index.html':   'index.html',
          '/privacidad':   'privacidad.html',
          '/privacidad.html': 'privacidad.html',
          '/terminos':     'terminos.html',
          '/terminos.html': 'terminos.html',
        };
        const file = staticPages[req.url];
        if (file) {
          try {
            const html = readFileSync(resolve(process.cwd(), file), 'utf-8');
            res.setHeader('Content-Type', 'text/html; charset=utf-8');
            res.statusCode = 200;
            res.end(html);
            return;
          } catch(e) {}
        }
        next();
      };
      // Insertar al inicio del stack para correr ANTES del redirect de base /app/
      server.middlewares.stack.unshift({ route: '', handle: handler });
    }
  };
}

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
  plugins: [serveLanding(), copyRootFiles()],
  server: { port: 3000 },
});
