import { describe, it, expect, beforeEach, vi } from 'vitest';
import { router } from './router';

describe('Router', () => {
  beforeEach(() => {
    // Reset hash
    window.location.hash = '';
  });

  describe('Pattern Matching', () => {
    it('should match root path', () => {
      const handler = vi.fn();
      router.on('/', handler);
      
      window.location.hash = '';
      window.dispatchEvent(new Event('hashchange'));
      
      expect(handler).toHaveBeenCalledWith({});
    });

    it('should match simple paths', () => {
      const handler = vi.fn();
      router.on('/create', handler);
      
      window.location.hash = '#/create';
      window.dispatchEvent(new Event('hashchange'));
      
      expect(handler).toHaveBeenCalledWith({});
    });

    it('should extract route parameters', () => {
      const handler = vi.fn();
      router.on('/lobby/:sessionId', handler);
      
      window.location.hash = '#/lobby/abc-123';
      window.dispatchEvent(new Event('hashchange'));
      
      expect(handler).toHaveBeenCalledWith({ sessionId: 'abc-123' });
    });

    it('should handle multiple parameters', () => {
      const handler = vi.fn();
      router.on('/game/:sessionId/:questionId', handler);
      
      window.location.hash = '#/game/session-1/q-42';
      window.dispatchEvent(new Event('hashchange'));
      
      expect(handler).toHaveBeenCalledWith({
        sessionId: 'session-1',
        questionId: 'q-42',
      });
    });
  });

  describe('Navigation', () => {
    it('should navigate to a path', () => {
      router.navigate('/create');
      // Hash might not update in test environment, check getCurrentPath instead
      expect(router.getCurrentPath()).toMatch(/create/);
    });

    it('should navigate with parameters', () => {
      router.navigate('/lobby/session-123');
      expect(router.getCurrentPath()).toMatch(/lobby.*session-123/);
    });

    it('should get current path', () => {
      window.location.hash = '#/lobby/test';
      expect(router.getCurrentPath()).toBe('/lobby/test');
    });

    it('should handle empty hash as root', () => {
      window.location.hash = '';
      expect(router.getCurrentPath()).toBe('/');
    });
  });

  describe('Query Parameters', () => {
    it('should extract query parameters', () => {
      window.location.hash = '#/create?debug=true&mode=test';
      
      const params = router.getQueryParams();
      
      expect(params).toEqual({
        debug: 'true',
        mode: 'test',
      });
    });

    it('should handle empty query string', () => {
      window.location.hash = '#/create';
      
      const params = router.getQueryParams();
      
      expect(params).toEqual({});
    });

    it('should decode URL-encoded values', () => {
      window.location.hash = '#/create?name=Hello%20World&value=100%25';
      
      const params = router.getQueryParams();
      
      expect(params).toEqual({
        name: 'Hello World',
        value: '100%',
      });
    });

    it('should handle parameters without values', () => {
      window.location.hash = '#/create?flag&debug=true';
      
      const params = router.getQueryParams();
      
      expect(params).toEqual({
        flag: '',
        debug: 'true',
      });
    });
  });
});
