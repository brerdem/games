import path from 'path';
import { fileURLToPath } from 'url';
import { defineConfig } from 'vite';

const root = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  root: path.resolve(root, 'island'),
  base: './',
  publicDir: path.resolve(root, 'island/public'),
  build: {
    outDir: path.resolve(root, 'dist/island'),
    emptyOutDir: true,
    chunkSizeWarningLimit: 2000,
    assetsInlineLimit: 0,
  },
});
