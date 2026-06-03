/**
 * Pure routing logic for the dev proxy.
 * Extracted so it can be unit-tested without starting an HTTP server.
 *
 * Route priority (mirrors the production Caddyfile):
 *   1. /api*  and /health  → api-server
 *   2. /host*              → host-app
 *   3. /analytics*         → analytics-ui
 *   4. /flashcard*         → flashcard-app
 *   5. /admin*             → admin-app
 *   6. /*  (catch-all)     → player-app
 */

/**
 * @typedef {{ API_PORT: number, HOST_PORT: number, PLAYER_PORT: number, ANALYTICS_PORT: number, FLASHCARD_PORT: number, ADMIN_PORT: number }} Ports
 */

/**
 * Build a route-resolver function for the given port configuration.
 * @param {Ports} ports
 * @returns {(pathname: string) => number}
 */
export function buildRouter(ports) {
  const { API_PORT, HOST_PORT, PLAYER_PORT, ANALYTICS_PORT, FLASHCARD_PORT, ADMIN_PORT } = ports;

  /** @type {Array<{ test: (p: string) => boolean, port: number, label: string }>} */
  const ROUTES = [
    { test: (p) => p.startsWith('/api') || p === '/health', port: API_PORT,       label: 'api' },
    { test: (p) => p.startsWith('/host'),                    port: HOST_PORT,      label: 'host' },
    { test: (p) => p.startsWith('/analytics'),               port: ANALYTICS_PORT, label: 'analytics' },
    { test: (p) => p.startsWith('/flashcard'),               port: FLASHCARD_PORT, label: 'flashcard' },
    { test: (p) => p === '/admin' || p.startsWith('/admin/'), port: ADMIN_PORT,    label: 'admin' },
    { test: () => true,                                      port: PLAYER_PORT,    label: 'player' },
  ];

  return function resolveTarget(pathname) {
    for (const route of ROUTES) {
      if (route.test(pathname)) return route.port;
    }
    return PLAYER_PORT;
  };
}
