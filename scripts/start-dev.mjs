/**
 * Start all QuizzQuizz dev services + proxy in the foreground.
 * Writes the process PID to .dev.pid so `npm stop` can find it.
 *
 * Services started:
 *   proxy        → node scripts/dev-proxy.mjs          (port 3000)
 *   api-server   → npm run dev -w @quizzquizz/api-server (port 3010)
 *   host-app     → npm run dev -w @quizzquizz/host-app   (port 3001)
 *   player-app   → npm run dev -w @quizzquizz/player-app (port 3002)
 *   analytics    → npm run dev -w @quizzquizz/analytics
 *   analytics-ui → npm run dev -w @quizzquizz/analytics-ui (port 3003)
 *   flashcard-app→ npm run dev -w @quizzquizz/flashcard-app (port 3004)
 */

import { spawn }    from 'node:child_process';
import { writeFileSync, unlinkSync } from 'node:fs';
import path         from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root      = path.resolve(__dirname, '..');
const pidFile   = path.join(root, '.dev.pid');

const SERVICES = [
  { name: 'proxy',         color: 'white',   cmd: 'node',  args: ['scripts/dev-proxy.mjs'] },
  { name: 'api',           color: 'blue',    cmd: 'npm',   args: ['run', 'dev', '-w', '@quizzquizz/api-server'] },
  { name: 'host',          color: 'green',   cmd: 'npm',   args: ['run', 'dev', '-w', '@quizzquizz/host-app'] },
  { name: 'player',        color: 'yellow',  cmd: 'npm',   args: ['run', 'dev', '-w', '@quizzquizz/player-app'] },
  { name: 'analytics',     color: 'magenta', cmd: 'npm',   args: ['run', 'dev', '-w', '@quizzquizz/analytics'] },
  { name: 'analytics-ui',  color: 'cyan',    cmd: 'npm',   args: ['run', 'dev', '-w', '@quizzquizz/analytics-ui'] },
  { name: 'flashcard',     color: 'red',     cmd: 'npm',   args: ['run', 'dev', '-w', '@quizzquizz/flashcard-app'] },
];

// Build concurrently command
const names   = SERVICES.map(s => s.name).join(',');
const colors  = SERVICES.map(s => s.color).join(',');
const cmds    = SERVICES.map(s => `"${s.cmd} ${s.args.join(' ')}"`).join(' ');

const child = spawn(
  'npx',
  [
    'concurrently',
    `--names=${names}`,
    `--prefix-colors=${colors}`,
    '--kill-others-on-fail',
    ...SERVICES.map(s => `${s.cmd} ${s.args.join(' ')}`),
  ],
  { stdio: 'inherit', cwd: root, shell: false }
);

writeFileSync(pidFile, String(child.pid));

function cleanup() {
  try { unlinkSync(pidFile); } catch { /* already gone */ }
}

child.on('exit', (code) => {
  cleanup();
  process.exit(code ?? 0);
});

process.on('SIGINT',  () => { child.kill('SIGINT');  });
process.on('SIGTERM', () => { child.kill('SIGTERM'); });
