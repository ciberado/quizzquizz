/**
 * Unit tests for ws-handler.ts
 *
 * Tests the WebSocket authentication and connection lifecycle:
 * - Missing auth params → connection closed with 1008
 * - Invalid host token → connection closed with 1008
 * - Player not in session → connection closed with 1008
 * - Valid player → connection accepted, initial sync sent
 * - Valid host token → connection accepted, initial sync sent
 *
 * lib0 and y-protocols are mocked because they have a module-level
 * binary initialization that fails under vite-node's transform pipeline.
 * The actual Yjs sync protocol correctness is covered by the end-to-end
 * WebSocket provider integration (y-websocket client ↔ server).
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// ── Mock lib0/y-protocols before they're resolved by vite-node ───────────────
vi.mock('lib0/encoding', () => ({
  createEncoder: () => ({ bufs: [], cbuf: new Uint8Array(100), cpos: 0 }),
  writeVarUint: vi.fn(),
  toUint8Array: vi.fn(() => new Uint8Array([0, 1, 2])),
  length: vi.fn(() => 4),
}));
vi.mock('lib0/decoding', () => ({
  createDecoder: vi.fn(() => ({})),
  readVarUint: vi.fn(() => 0),
}));
vi.mock('y-protocols/sync', () => ({
  writeSyncStep1: vi.fn(),
  writeSyncStep2: vi.fn(),
  writeUpdate: vi.fn(),
  readSyncMessage: vi.fn(),
}));

// ── Mock Prisma ───────────────────────────────────────────────────────────────
vi.mock('./db/index.js', () => ({
  getPrisma: vi.fn(),
  initDatabase: vi.fn(),
  resetPrismaInstance: vi.fn(),
}));

import { getPrisma } from './db/index.js';
import { createWsServer } from './ws-handler.js';
import type { IncomingMessage } from 'http';
import { getOrCreateSession, destroySession } from './session-doc-manager.js';

// ── Helpers ──────────────────────────────────────────────────────────────────

function makePrismaMock(opts: {
  session?: { id: string; hostToken: string } | null;
  player?: { id: string } | null;
}) {
  return {
    quizSession: {
      findUnique: vi.fn().mockResolvedValue(opts.session ?? null),
    },
    player: {
      findFirst: vi.fn().mockResolvedValue(opts.player ?? null),
    },
  };
}

function makeReq(url: string, host = 'localhost'): IncomingMessage {
  return { url, headers: { host } } as unknown as IncomingMessage;
}

function makeWs() {
  const sends: Uint8Array[] = [];
  let closed = false;
  let closeCode = 0;
  const listeners: Record<string, Array<(...args: unknown[]) => void>> = {};

  const ws = {
    readyState: 1, // OPEN
    sends,
    send(data: Uint8Array) { sends.push(data); },
    close(code: number) { closed = true; closeCode = code; },
    on(event: string, handler: (...args: unknown[]) => void) {
      (listeners[event] ??= []).push(handler);
    },
    emit(event: string, ...args: unknown[]) {
      for (const h of listeners[event] ?? []) h(...args);
    },
    isClosed: () => closed,
    getCloseCode: () => closeCode,
  };
  return ws;
}

const SESSION_ID = 'ws-test-session';
const HOST_TOKEN = 'valid-host-token';
const PLAYER_ID = 'valid-player-id';
const validSession = { id: SESSION_ID, hostToken: HOST_TOKEN };
const validPlayer = { id: PLAYER_ID };

beforeEach(() => {
  destroySession(SESSION_ID);
  getOrCreateSession(SESSION_ID);
  vi.clearAllMocks();
});

afterEach(() => {
  destroySession(SESSION_ID);
});

describe('createWsServer – authentication', () => {
  it('closes with 1008 when no auth params are provided', async () => {
    vi.mocked(getPrisma).mockReturnValue(makePrismaMock({ session: validSession }) as ReturnType<typeof getPrisma>);
    const wss = createWsServer();
    const ws = makeWs();
    const req = makeReq(`/ws/sessions/${SESSION_ID}`);

    wss.emit('connection', ws as unknown as import('ws').WebSocket, req);
    await vi.waitFor(() => { if (!ws.isClosed()) throw new Error('Not closed yet'); }, { timeout: 1000 });
    expect(ws.getCloseCode()).toBe(1008);
  });

  it('closes with 1008 when session is not found', async () => {
    vi.mocked(getPrisma).mockReturnValue(makePrismaMock({ session: null }) as ReturnType<typeof getPrisma>);
    const wss = createWsServer();
    const ws = makeWs();
    const req = makeReq(`/ws/sessions/${SESSION_ID}?hostToken=${HOST_TOKEN}`);

    wss.emit('connection', ws as unknown as import('ws').WebSocket, req);
    await vi.waitFor(() => { if (!ws.isClosed()) throw new Error('Not closed yet'); }, { timeout: 1000 });
    expect(ws.getCloseCode()).toBe(1008);
  });

  it('closes with 1008 when host token does not match', async () => {
    vi.mocked(getPrisma).mockReturnValue(makePrismaMock({ session: validSession }) as ReturnType<typeof getPrisma>);
    const wss = createWsServer();
    const ws = makeWs();
    const req = makeReq(`/ws/sessions/${SESSION_ID}?hostToken=wrong-token`);

    wss.emit('connection', ws as unknown as import('ws').WebSocket, req);
    await vi.waitFor(() => { if (!ws.isClosed()) throw new Error('Not closed yet'); }, { timeout: 1000 });
    expect(ws.getCloseCode()).toBe(1008);
  });

  it('closes with 1008 when player is not found in session', async () => {
    vi.mocked(getPrisma).mockReturnValue(makePrismaMock({ session: validSession, player: null }) as ReturnType<typeof getPrisma>);
    const wss = createWsServer();
    const ws = makeWs();
    const req = makeReq(`/ws/sessions/${SESSION_ID}?playerId=unknown-player`);

    wss.emit('connection', ws as unknown as import('ws').WebSocket, req);
    await vi.waitFor(() => { if (!ws.isClosed()) throw new Error('Not closed yet'); }, { timeout: 1000 });
    expect(ws.getCloseCode()).toBe(1008);
  });

  it('closes with 1008 when session ID is missing from URL', async () => {
    vi.mocked(getPrisma).mockReturnValue(makePrismaMock({ session: validSession }) as ReturnType<typeof getPrisma>);
    const wss = createWsServer();
    const ws = makeWs();
    const req = makeReq(`/ws/sessions/?hostToken=${HOST_TOKEN}`);

    wss.emit('connection', ws as unknown as import('ws').WebSocket, req);
    await vi.waitFor(() => { if (!ws.isClosed()) throw new Error('Not closed yet'); }, { timeout: 1000 });
    expect(ws.getCloseCode()).toBe(1008);
  });

  it('accepts connection with valid host token — not closed, sends initial sync', async () => {
    vi.mocked(getPrisma).mockReturnValue(makePrismaMock({ session: validSession }) as ReturnType<typeof getPrisma>);
    const wss = createWsServer();
    const ws = makeWs();
    const req = makeReq(`/ws/sessions/${SESSION_ID}?hostToken=${HOST_TOKEN}`);

    wss.emit('connection', ws as unknown as import('ws').WebSocket, req);
    await vi.waitFor(() => expect(ws.sends.length).toBeGreaterThanOrEqual(2), { timeout: 1000 });

    expect(ws.isClosed()).toBe(false);
  });

  it('accepts connection with valid player ID — not closed, sends initial sync', async () => {
    vi.mocked(getPrisma).mockReturnValue(makePrismaMock({ session: validSession, player: validPlayer }) as ReturnType<typeof getPrisma>);
    const wss = createWsServer();
    const ws = makeWs();
    const req = makeReq(`/ws/sessions/${SESSION_ID}?playerId=${PLAYER_ID}`);

    wss.emit('connection', ws as unknown as import('ws').WebSocket, req);
    await vi.waitFor(() => expect(ws.sends.length).toBeGreaterThanOrEqual(2), { timeout: 1000 });

    expect(ws.isClosed()).toBe(false);
  });

  it('registers client in session and removes it on close', async () => {
    vi.mocked(getPrisma).mockReturnValue(makePrismaMock({ session: validSession }) as ReturnType<typeof getPrisma>);
    const wss = createWsServer();
    const ws = makeWs();
    const req = makeReq(`/ws/sessions/${SESSION_ID}?hostToken=${HOST_TOKEN}`);

    wss.emit('connection', ws as unknown as import('ws').WebSocket, req);
    await vi.waitFor(() => expect(ws.sends.length).toBeGreaterThanOrEqual(2), { timeout: 1000 });

    const { clients } = getOrCreateSession(SESSION_ID);
    expect(clients.has(ws as unknown as import('ws').WebSocket)).toBe(true);

    ws.emit('close');
    expect(clients.has(ws as unknown as import('ws').WebSocket)).toBe(false);
  });

  it('broadcasts doc updates to connected clients after auth', async () => {
    vi.mocked(getPrisma).mockReturnValue(makePrismaMock({ session: validSession }) as ReturnType<typeof getPrisma>);
    const wss = createWsServer();
    const ws = makeWs();
    const req = makeReq(`/ws/sessions/${SESSION_ID}?hostToken=${HOST_TOKEN}`);

    wss.emit('connection', ws as unknown as import('ws').WebSocket, req);
    await vi.waitFor(() => expect(ws.sends.length).toBeGreaterThanOrEqual(2), { timeout: 1000 });

    const countBefore = ws.sends.length;

    // Trigger a doc update via updateDoc (simulates a REST mutation)
    const { updateDoc } = await import('./session-doc-manager.js');
    updateDoc(SESSION_ID, { status: 'playing' });

    await vi.waitFor(() => expect(ws.sends.length).toBeGreaterThan(countBefore), { timeout: 1000 });
  });
});

