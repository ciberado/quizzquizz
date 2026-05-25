/**
 * Hash-based router for flashcard app.
 */

type RouteHandler = (params: Record<string, string>) => void;

interface Route {
  pattern: RegExp;
  handler: RouteHandler;
  paramNames: string[];
}

class Router {
  private routes: Route[] = [];
  private currentPath: string = '';

  constructor() {
    window.addEventListener('hashchange', () => this.handle());
    window.addEventListener('load', () => this.handle());
  }

  on(path: string, handler: RouteHandler): void {
    const paramNames: string[] = [];
    const pattern = path.replace(/:([^/]+)/g, (_, name) => {
      paramNames.push(name);
      return '([^/]+)';
    });
    this.routes.push({ pattern: new RegExp(`^${pattern}$`), handler, paramNames });
  }

  navigate(path: string): void {
    window.location.hash = path;
  }

  getCurrentPath(): string {
    return window.location.hash.slice(1) || '/';
  }

  private handle(): void {
    const fullPath = this.getCurrentPath();
    const path = fullPath.split('?')[0] || '/';

    if (fullPath === this.currentPath) return;
    this.currentPath = fullPath;

    for (const route of this.routes) {
      const match = path.match(route.pattern);
      if (match) {
        const params: Record<string, string> = {};
        route.paramNames.forEach((name, i) => { params[name] = match[i + 1] || ''; });
        route.handler(params);
        return;
      }
    }

    console.warn(`No route matched: ${path}`);
  }

  refresh(): void {
    this.currentPath = '';
    this.handle();
  }
}

export const router = new Router();
