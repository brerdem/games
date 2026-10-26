import test from 'node:test';
import { runMisfire } from './browser-support.mjs';

test('trusted flicks and pulls after a pause at 360', async () => {
  await runMisfire(360, 800);
});
