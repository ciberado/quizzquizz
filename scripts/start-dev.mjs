/**
 * Start all QuizzQuizz dev services + proxy in the foreground.
 *
 * Services started:
 *   proxy        → node scripts/dev-proxy.mjs          (port 3000)
 *   api-server   → npm run dev -w @quizzquizz/api-server (port 3010)
 *   host-app     → npm run dev -w @quizzquizz/host-app   (port 3001)
 *   player-app   → npm run dev -w @quizzquizz/player-app (port 3002)
 *   analytics    → npm run dev -w @quizzquizz/analytics
 *   analytics-ui → npm run dev -w @quizzquizz/analytics-ui (port 3003)
 *   flashcard-app→ npm run dev -w @quizzquizz/flashcard-app (port 3004)
 *
 * Use `npm stop` to stop all services (finds processes by port, no PID file needed).
 */

import { spawn }    from 'node:child_process';
import path         from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root      = path.resolve(__dirname, '..');

const SERVICES = [
  { name: 'proxy',         color: 'white',   cmd: 'node',  args: ['scripts/dev-proxy.mjs'] },
  { name: 'api',           color: 'blue',    cmd: 'npm',   args: ['run', 'dev', '-w', '@quizzquizz/api-server'] },
  { name: 'host',          color: 'green',   cmd: 'npm',   args: ['run', 'dev', '-w', '@quizzquizz/host-app'] },
  { name: 'player',        color: 'yellow',  cmd: 'npm',   args: ['run', 'dev', '-w', '@quizzquizz/player-app'] },
  { name: 'analytics',     color: 'magenta', cmd: 'npm',   args: ['run', 'dev', '-w', '@quizzquizz/analytics'] },
  { name: 'analytics-ui',  color: 'cyan',    cmd: 'npm',   args: ['run', 'dev', '-w', '@quizzquizz/analytics-ui'] },
  { name: 'flashcard',     color: 'red',     cmd: 'npm',   args: ['run', 'dev', '-w', '@quizzquizz/flashcard-app'] },
];

const child = spawn(
  'npx',
  [
    'concurrently',
    `--names=${SERVICES.map(s => s.name).join(',')}`,
    `--prefix-colors=${SERVICES.map(s => s.color).join(',')}`,
    '--kill-others-on-fail',
    ...SERVICES.map(s => `${s.cmd} ${s.args.join(' ')}`),
  ],
  { stdio: 'inherit', cwd: root, shell: false }
);

child.on('exit', (code) => process.exit(code ?? 0));

process.on('SIGINT',  () => child.kill('SIGINT'));
process.on('SIGTERM', () => child.kill('SIGTERM'));
