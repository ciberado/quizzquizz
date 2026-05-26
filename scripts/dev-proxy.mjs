/**
 * Dev reverse proxy — mirrors the production Caddyfile routing.
 * Listens on PORT (default 3000) and forwards requests to the right dev server.
 *
 * Route table (same order as Caddyfile):
 *   /api*        → API server  (DEV_API_PORT,  default 3010)
 *   /health      → API server
 *   /host*       → host-app    (DEV_HOST_PORT, default 3001)
 *   /analytics*  → analytics-ui(DEV_ANALYTICS_PORT, default 3003)
 *   /flashcard*  → flashcard-app(DEV_FLASHCARD_PORT, default 3004)
 *   /*           → player-app  (DEV_PLAYER_PORT, default 3002)
 */

import http from 'node:http';
import net  from 'node:net';
import { buildRouter } from './proxy-router.mjs';

const PROXY_PORT     = parseInt(process.env.PORT               ?? '3000');
const API_PORT       = parseInt(process.env.DEV_API_PORT       ?? '3010');
const HOST_PORT      = parseInt(process.env.DEV_HOST_PORT      ?? '3001');
const PLAYER_PORT    = parseInt(process.env.DEV_PLAYER_PORT    ?? '3002');
const ANALYTICS_PORT = parseInt(process.env.DEV_ANALYTICS_PORT ?? '3003');
const FLASHCARD_PORT = parseInt(process.env.DEV_FLASHCARD_PORT ?? '3004');

const resolveTarget = buildRouter({ API_PORT, HOST_PORT, PLAYER_PORT, ANALYTICS_PORT, FLASHCARD_PORT });

const server = http.createServer((req, res) => {
  const url   = new URL(req.url ?? '/', `http://localhost`);
  const port  = resolveTarget(url.pathname);

  const options = {
    hostname: '127.0.0.1',
    port,
    path:    req.url,
    method:  req.method,
    headers: { ...req.headers, host: `localhost:${port}` },
  };

  const proxy = http.request(options, (proxyRes) => {
    res.writeHead(proxyRes.statusCode ?? 502, proxyRes.headers);
    proxyRes.pipe(res, { end: true });
  });

  proxy.on('error', (err) => {
    if (!res.headersSent) {
      res.writeHead(502, { 'content-type': 'text/plain' });
    }
    res.end(`Proxy error (→ :${port}): ${err.message}`);
  });

  req.pipe(proxy, { end: true });
});

// WebSocket upgrade forwarding (needed for Vite HMR when hmr.clientPort is not set)
server.on('upgrade', (req, socket, head) => {
  const url  = new URL(req.url ?? '/', `http://localhost`);
  const port = resolveTarget(url.pathname);

  const proxySocket = new net.Socket();
  proxySocket.connect(port, '127.0.0.1', () => {
    proxySocket.write(
      `${req.method} ${req.url} HTTP/1.1\r\n` +
      `Host: localhost:${port}\r\n` +
      Object.entries(req.headers)
        .filter(([k]) => k.toLowerCase() !== 'host')
        .map(([k, v]) => `${k}: ${v}`)
        .join('\r\n') +
      '\r\n\r\n'
    );
    proxySocket.write(head);
    socket.pipe(proxySocket);
    proxySocket.pipe(socket);
  });

  proxySocket.on('error', () => socket.destroy());
  socket.on('error', () => proxySocket.destroy());
});

server.listen(PROXY_PORT, '0.0.0.0', () => {
  console.log(`\n🔀 Dev proxy listening on http://localhost:${PROXY_PORT}`);
  console.log(`   /            → player-app   :${PLAYER_PORT}`);
  console.log(`   /host*       → host-app     :${HOST_PORT}`);
  console.log(`   /analytics*  → analytics-ui :${ANALYTICS_PORT}`);
  console.log(`   /flashcard*  → flashcard-app:${FLASHCARD_PORT}`);
  console.log(`   /api*        → api-server   :${API_PORT}\n`);
});
