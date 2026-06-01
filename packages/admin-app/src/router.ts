/**
 * Client-side router for the admin app.
 * Single-level path matching with auth guard.
 */

type RouteHandler = () => void;

const routes: Record<string, RouteHandler> = {};

export function route(path: string, handler: RouteHandler) {
  routes[path] = handler;
}

export function navigate(path: string) {
  history.pushState(null, '', `/admin${path}`);
  dispatch();
}

export function getCurrentPath(): string {
  const full = location.pathname;
  // Strip /admin prefix
  return full.replace(/^\/admin/, '') || '/';
}

function dispatch() {
  const path = getCurrentPath();
  const handler = routes[path] ?? routes['*'];
  handler?.();
}

export function startRouter() {
  window.addEventListener('popstate', dispatch);
  dispatch();
}
