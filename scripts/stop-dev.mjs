/**
 * Stop all QuizzQuizz dev services started by `npm start`.
 * Reads .dev.pid and sends SIGTERM to the concurrently process,
 * which cascades to all child services.
 */

import { readFileSync, unlinkSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root    = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const pidFile = path.join(root, '.dev.pid');

let pid;
try {
  pid = parseInt(readFileSync(pidFile, 'utf8').trim(), 10);
} catch {
  console.log('ℹ️  No .dev.pid found — services may not be running.');
  process.exit(0);
}

if (isNaN(pid)) {
  console.error('❌ Invalid PID in .dev.pid');
  process.exit(1);
}

try {
  process.kill(pid, 'SIGTERM');
  try { unlinkSync(pidFile); } catch { /* already gone */ }
  console.log(`✅ Sent SIGTERM to process group ${pid} — all dev services stopping.`);
} catch (err) {
  if (err.code === 'ESRCH') {
    console.log('ℹ️  Process not found — already stopped.');
    try { unlinkSync(pidFile); } catch { /* ignore */ }
  } else {
    console.error('❌ Failed to stop:', err.message);
    process.exit(1);
  }
}
