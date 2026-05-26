/**
 * Stop all QuizzQuizz dev services by finding and killing processes
 * listening on the known dev ports.
 *
 * Ports killed:
 *   3000 — dev proxy
 *   3001 — host-app (Vite)
 *   3002 — player-app (Vite)
 *   3003 — analytics-ui (Vite)
 *   3004 — flashcard-app (Vite)
 *   3010 — api-server
 */

import { execSync } from 'node:child_process';

const PORTS = [3000, 3001, 3002, 3003, 3004, 3010];

let stopped = 0;

for (const port of PORTS) {
  let pids = [];
  try {
    // lsof is available on macOS and Linux; -t gives only PIDs
    const out = execSync(`lsof -ti tcp:${port} 2>/dev/null`, { encoding: 'utf8' });
    pids = out.trim().split('\n').filter(Boolean).map(Number).filter(n => !isNaN(n));
  } catch {
    // lsof returns exit code 1 when no process found — treat as empty
  }

  for (const pid of pids) {
    try {
      process.kill(pid, 'SIGTERM');
      console.log(`  Stopped PID ${pid} on port ${port}`);
      stopped++;
    } catch (err) {
      if (err.code !== 'ESRCH') {
        console.warn(`  Warning: could not kill PID ${pid} on port ${port}: ${err.message}`);
      }
    }
  }
}

if (stopped === 0) {
  console.log('ℹ️  No dev services were running on the known ports.');
} else {
  console.log(`✅ Stopped ${stopped} process${stopped !== 1 ? 'es' : ''}.`);
}
