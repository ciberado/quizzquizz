/**
 * Hash-based router for analytics-ui.
 * Routes: #/host/sessions/:id, #/host/banks/:id/health, etc.
 */

type RouteHandler = (params: Record<string, string>) => void;

interface Route {
  pattern: RegExp;
  paramNames: string[];
  handler: RouteHandler;
}

export class Router {
  private routes: Route[] = [];
  private notFoundHandler: RouteHandler = () => {
    renderError('Page not found');
  };

  on(path: string, handler: RouteHandler): this {
    // Convert :param to named capture groups
    const paramNames: string[] = [];
    const regexStr = path.replace(/:([a-zA-Z]+)/g, (_, name: string) => {
      paramNames.push(name);
      return '([^/]+)';
    });
    this.routes.push({
      pattern: new RegExp('^' + regexStr + '$'),
      paramNames,
      handler,
    });
    return this;
  }

  notFound(handler: RouteHandler): this {
    this.notFoundHandler = handler;
    return this;
  }

  navigate(hash: string): void {
    const path = hash.startsWith('#') ? hash.slice(1) : hash;
    for (const route of this.routes) {
      const match = route.pattern.exec(path);
      if (match) {
        const params: Record<string, string> = {};
        route.paramNames.forEach((name, i) => {
          params[name] = decodeURIComponent(match[i + 1] ?? '');
        });
        route.handler(params);
        return;
      }
    }
    this.notFoundHandler({});
  }

  start(): void {
    const handleHash = () => {
      this.navigate(window.location.hash || '#/player/dashboard');
    };
    window.addEventListener('hashchange', handleHash);
    handleHash();
  }
}

function renderError(message: string): void {
  const app = document.getElementById('app');
  if (app) app.innerHTML = `<div class="error-page"><h1>404</h1><p>${message}</p><a href="#/player/dashboard">Go to dashboard</a></div>`;
}
