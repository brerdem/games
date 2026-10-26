import test from 'node:test';
import { runMisfire } from './browser-support.mjs';

test('trusted flicks and pulls after a pause at 430', async () => {
  await runMisfire(430, 932);
});
