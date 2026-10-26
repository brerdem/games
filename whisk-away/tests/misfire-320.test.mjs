import test from 'node:test';
import { runMisfire } from './browser-support.mjs';

test('trusted flicks and pulls after a pause at 320', async () => {
  await runMisfire(320, 568);
});
