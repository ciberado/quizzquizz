/**
 * Unit tests for scripts/proxy-router.mjs
 * Run with: node --test scripts/proxy-router.test.mjs
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { buildRouter } from './proxy-router.mjs';

const PORTS = {
  API_PORT:       3010,
  HOST_PORT:      3001,
  PLAYER_PORT:    3002,
  ANALYTICS_PORT: 3003,
  FLASHCARD_PORT: 3004,
  ADMIN_PORT:     3005,
};

const resolve = buildRouter(PORTS);

describe('proxy router — buildRouter()', () => {
  describe('API routes', () => {
    it('routes /api/sessions to API port', () => {
      assert.equal(resolve('/api/sessions'), 3010);
    });

    it('routes /api/question-banks to API port', () => {
      assert.equal(resolve('/api/question-banks'), 3010);
    });

    it('routes /api/ to API port', () => {
      assert.equal(resolve('/api/'), 3010);
    });

    it('routes /health to API port', () => {
      assert.equal(resolve('/health'), 3010);
    });
  });

  describe('host-app routes', () => {
    it('routes /host/ to host port', () => {
      assert.equal(resolve('/host/'), 3001);
    });

    it('routes /host to host port', () => {
      assert.equal(resolve('/host'), 3001);
    });

    it('routes /host/assets/main.js to host port', () => {
      assert.equal(resolve('/host/assets/main.js'), 3001);
    });
  });

  describe('analytics-ui routes', () => {
    it('routes /analytics/ to analytics port', () => {
      assert.equal(resolve('/analytics/'), 3003);
    });

    it('routes /analytics/dashboard to analytics port', () => {
      assert.equal(resolve('/analytics/dashboard'), 3003);
    });
  });

  describe('flashcard-app routes', () => {
    it('routes /flashcard/ to flashcard port', () => {
      assert.equal(resolve('/flashcard/'), 3004);
    });

    it('routes /flashcard/assets/index.js to flashcard port', () => {
      assert.equal(resolve('/flashcard/assets/index.js'), 3004);
    });
  });

  describe('admin-app routes', () => {
    it('routes /admin/ to admin port', () => {
      assert.equal(resolve('/admin/'), 3005);
    });

    it('routes /admin to admin port (without trailing slash)', () => {
      assert.equal(resolve('/admin'), 3005);
    });

    it('routes /admin/login to admin port', () => {
      assert.equal(resolve('/admin/login'), 3005);
    });

    it('routes /admin/assets/index.js to admin port', () => {
      assert.equal(resolve('/admin/assets/index.js'), 3005);
    });
  });

  describe('player-app routes (catch-all)', () => {
    it('routes / to player port', () => {
      assert.equal(resolve('/'), 3002);
    });

    it('routes /index.html to player port', () => {
      assert.equal(resolve('/index.html'), 3002);
    });

    it('routes /assets/player.js to player port', () => {
      assert.equal(resolve('/assets/player.js'), 3002);
    });
  });

  describe('priority ordering', () => {
    it('/api path takes priority over catch-all', () => {
      assert.equal(resolve('/api'), 3010);
    });

    it('/host path takes priority over catch-all', () => {
      assert.equal(resolve('/host'), 3001);
    });

    it('/flashcard path is not mistaken for /host', () => {
      assert.notEqual(resolve('/flashcard/'), resolve('/host/'));
      assert.equal(resolve('/flashcard/'), 3004);
    });

    it('/admin path takes priority over catch-all', () => {
      assert.equal(resolve('/admin'), 3005);
      assert.equal(resolve('/admin/'), 3005);
    });
  });

  describe('custom port configuration', () => {
    it('respects custom ports passed to buildRouter', () => {
      const customResolve = buildRouter({
        API_PORT: 9010,
        HOST_PORT: 9001,
        PLAYER_PORT: 9002,
        ANALYTICS_PORT: 9003,
        FLASHCARD_PORT: 9004,
        ADMIN_PORT: 9005,
      });
      assert.equal(customResolve('/api/test'), 9010);
      assert.equal(customResolve('/host/'), 9001);
      assert.equal(customResolve('/'), 9002);
      assert.equal(customResolve('/analytics/'), 9003);
      assert.equal(customResolve('/flashcard/'), 9004);
      assert.equal(customResolve('/admin/'), 9005);
    });
  });
});
