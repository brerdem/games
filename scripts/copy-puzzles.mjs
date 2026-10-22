import { cpSync, mkdirSync, copyFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const dist = resolve(root, 'dist');
mkdirSync(dist, { recursive: true });
copyFileSync(resolve(root, 'index.html'), resolve(dist, 'index.html'));
cpSync(resolve(root, 'thumbs'), resolve(dist, 'thumbs'), { recursive: true });
console.log('copied index.html and thumbs -> dist/');
for (const name of ['unravel', 'pinball-pit', 'gridlock', 'ring-out', 'smash-cascade', 'scratch-and-slay', 'flow-fort', 'sand-strata', 'top-turner', 'spillproof', 'foldprint', 'knock-on']) {
  cpSync(resolve(root, name), resolve(dist, name), { recursive: true });
  console.log(`copied ${name} -> dist/${name}`);
}
