/**
 * Simple hash-based router for host app
 */

type RouteHandler = (params: Record<string, string>) => void;

interface Route {
  pattern: RegExp;
  handler: RouteHandler;
  keys: string[];
}

class Router {
  private routes: Route[] = [];
  private currentRoute: string = '';

  constructor() {
    // Listen for hash changes
    window.addEventListener('hashchange', () => this.handleRoute());
    window.addEventListener('load', () => this.handleRoute());
  }

  /**
   * Register a route pattern and handler
   */
  on(pattern: string, handler: RouteHandler): void {
    const keys: string[] = [];
    
    // Convert route pattern to regex
    // e.g., "/lobby/:sessionId" -> /^\/lobby\/([^/]+)$/
    const regexPattern = pattern
      .replace(/:[^/]+/g, (match) => {
        keys.push(match.slice(1)); // Remove ':'
        return '([^/]+)';
      })
      .replace(/\//g, '\\/');

    this.routes.push({
      pattern: new RegExp(`^${regexPattern}$`),
      handler,
      keys,
    });
  }

  /**
   * Navigate to a route
   */
  navigate(path: string): void {
    window.location.hash = path;
  }

  /**
   * Get current route path (without #)
   */
  getCurrentPath(): string {
    return window.location.hash.slice(1) || '/';
  }

  /**
   * Handle route changes
   */
  private handleRoute(): void {
    const path = this.getCurrentPath();
    
    // Strip query parameters for matching
    const pathWithoutQuery = path.split('?')[0];
    
    this.currentRoute = path;

    // Find matching route
    for (const route of this.routes) {
      const match = pathWithoutQuery.match(route.pattern);
      if (match) {
        // Extract params from match groups
        const params: Record<string, string> = {};
        route.keys.forEach((key, index) => {
          params[key] = match[index + 1];
        });

        // Call handler
        route.handler(params);
        return;
      }
    }

    // No route found - could add 404 handler here
    console.warn(`No route found for: ${path}`);
  }

  /**
   * Get query parameters from current URL
   */
  getQueryParams(): Record<string, string> {
    const hash = window.location.hash;
    const queryStart = hash.indexOf('?');
    
    if (queryStart === -1) {
      return {};
    }

    const queryString = hash.slice(queryStart + 1);
    const params: Record<string, string> = {};

    queryString.split('&').forEach((pair) => {
      const [key, value] = pair.split('=');
      if (key) {
        params[decodeURIComponent(key)] = decodeURIComponent(value || '');
      }
    });

    return params;
  }
}

// Export singleton instance
export const router = new Router();
