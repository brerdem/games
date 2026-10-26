import test from 'node:test';
import { runMisfire } from './browser-support.mjs';

test('trusted flicks and pulls after a pause at 390', async () => {
  await runMisfire(390, 844);
});
