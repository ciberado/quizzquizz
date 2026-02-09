/**
 * Simple hash-based router for SPA navigation
 */

type RouteHandler = (params: Record<string, string>) => void;

interface Route {
  pattern: RegExp;
  handler: RouteHandler;
  paramNames: string[];
}

class Router {
  private routes: Route[] = [];
  private currentRoute: string = '';

  constructor() {
    // Listen for hash changes
    window.addEventListener('hashchange', () => this.handleRouteChange());
    window.addEventListener('load', () => this.handleRouteChange());
  }

  /**
   * Register a route with optional parameters
   * @param path - Route path (e.g., '/join', '/lobby/:id', '/play/:sessionId')
   * @param handler - Function to call when route matches
   */
  on(path: string, handler: RouteHandler): void {
    const paramNames: string[] = [];
    
    // Convert path pattern to regex and extract param names
    const pattern = path.replace(/:([^/]+)/g, (_, paramName) => {
      paramNames.push(paramName);
      return '([^/]+)';
    });
    
    const regex = new RegExp(`^${pattern}$`);
    
    this.routes.push({ pattern: regex, handler, paramNames });
  }

  /**
   * Navigate to a new route
   * @param path - Target path
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
  private handleRouteChange(): void {
    const fullPath = this.getCurrentPath();
    
    // Strip query parameters for route matching
    const path = fullPath.split('?')[0];
    
    // Avoid re-processing same route
    if (fullPath === this.currentRoute) {
      return;
    }
    
    this.currentRoute = fullPath;

    // Find matching route
    for (const route of this.routes) {
      const match = path.match(route.pattern);
      if (match) {
        // Extract parameters
        const params: Record<string, string> = {};
        route.paramNames.forEach((name, index) => {
          params[name] = match[index + 1] || '';
        });
        
        // Call handler
        route.handler(params);
        return;
      }
    }

    // No route matched - could handle 404 here
    console.warn(`No route matched for path: ${path}`);
  }

  /**
   * Force route re-evaluation
   */
  refresh(): void {
    this.currentRoute = '';
    this.handleRouteChange();
  }
}

// Export singleton instance
export const router = new Router();
