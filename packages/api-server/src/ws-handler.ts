/**
 * WebSocket handler for Yjs session document sync.
 *
 * Implements the y-websocket sync protocol so the standard
 * WebsocketProvider client works out-of-the-box on the frontend.
 *
 * Protocol (messageType 0 = sync):
 *   step 0 = writeSyncStep1 (state vector)
 *   step 1 = writeSyncStep2 (update)
 *   step 2 = writeUpdate    (incremental update)
 *
 * The server is the sole writer of the Yjs doc; clients are read-only.
 * Auth is checked via ?playerId= or ?hostToken= query params before
 * allowing the connection.
 */

import { WebSocketServer, WebSocket, type RawData } from 'ws';
import type { IncomingMessage } from 'http';
import * as Y from 'yjs';
import * as syncProtocol from 'y-protocols/sync';
import * as encoding from 'lib0/encoding';
import * as decoding from 'lib0/decoding';
import { getOrCreateSession } from './session-doc-manager.js';
import { getPrisma } from './db/index.js';

const MESSAGE_SYNC = 0;

function sendSyncStep1(ws: WebSocket, doc: Y.Doc): void {
  try {
    const encoder = encoding.createEncoder();
    encoding.writeVarUint(encoder, MESSAGE_SYNC);
    syncProtocol.writeSyncStep1(encoder, doc);
    ws.send(encoding.toUint8Array(encoder));
  } catch (e) {
    console.error('[WS] Error sending sync step1:', e);
  }
}

function sendFullState(ws: WebSocket, doc: Y.Doc): void {
  try {
    // Send sync-step-2 with an empty state vector so the client receives
    // the entire current doc state.
    // We must use a valid empty state vector (single 0x00 byte = 0 clients)
    // rather than a completely empty Uint8Array, which is not valid varint encoding.
    const encoder = encoding.createEncoder();
    encoding.writeVarUint(encoder, MESSAGE_SYNC);
    syncProtocol.writeSyncStep2(encoder, doc, Y.encodeStateVector(new Y.Doc()));
    ws.send(encoding.toUint8Array(encoder));
  } catch (e) {
    console.error('[WS] Error sending full state:', e);
  }
}

/** Extract the session ID from a URL like /ws/sessions/<id> */
function extractSessionId(url: string | undefined): string | null {
  if (!url) return null;
  const match = url.match(/\/ws\/sessions\/([^/?#]+)/);
  return match?.[1] ?? null;
}

export function createWsServer(): WebSocketServer {
  const wss = new WebSocketServer({ noServer: true });

  wss.on('connection', (ws: WebSocket, req: IncomingMessage) => {
    handleConnection(ws, req).catch((err) => {
      console.error('[WS] Unhandled error in connection handler:', err);
      if (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING) {
        ws.close(1011, 'Internal server error');
      }
    });
  });

  return wss;
}

async function handleConnection(ws: WebSocket, req: IncomingMessage): Promise<void> {
  const sessionId = extractSessionId(req.url);

  if (!sessionId) {
    ws.close(1008, 'Invalid session ID');
    return;
  }

  // -- Auth --
  const urlObj = new URL(req.url!, `http://${req.headers.host ?? 'localhost'}`);
  const playerId = urlObj.searchParams.get('playerId');
  const hostToken = urlObj.searchParams.get('hostToken');

  if (!playerId && !hostToken) {
    ws.close(1008, 'Authentication required');
    return;
  }

  try {
    const session = await getPrisma().quizSession.findUnique({
      where: { id: sessionId },
      select: { id: true, hostToken: true },
    });

    if (!session) {
      ws.close(1008, 'Session not found');
      return;
    }

    // Host validation
    if (hostToken && session.hostToken !== hostToken) {
      ws.close(1008, 'Invalid host token');
      return;
    }

    // Player validation (lightweight: just check they're in the session)
    if (playerId && !hostToken) {
      const player = await getPrisma().player.findFirst({
        where: { id: playerId, sessionId },
        select: { id: true },
      });
      if (!player) {
        ws.close(1008, 'Player not in session');
        return;
      }
    }
  } catch (err) {
    console.error('[WS] Auth error:', err);
    ws.close(1011, 'Server error during auth');
    return;
  }

  // -- Register client --
  const { doc, clients } = getOrCreateSession(sessionId);
  clients.add(ws);

  // Broadcast doc updates to this client.
  // Wrapped in try-catch so a failed ws.send() never propagates to the
  // Yjs transact() call site (which could crash the server).
  const updateHandler = (update: Uint8Array, origin: unknown): void => {
    if (origin === ws) return; // don't echo
    if (ws.readyState !== WebSocket.OPEN) return;
    try {
      const encoder = encoding.createEncoder();
      encoding.writeVarUint(encoder, MESSAGE_SYNC);
      syncProtocol.writeUpdate(encoder, update);
      ws.send(encoding.toUint8Array(encoder));
    } catch (e) {
      console.error('[WS] Error sending update to client:', e);
    }
  };
  doc.on('update', updateHandler);

  // -- Handle messages from client (sync protocol) --
  ws.on('message', (data: RawData) => {
    const buf = Buffer.isBuffer(data) ? data : Buffer.from(data as ArrayBuffer);
    try {
      const decoder = decoding.createDecoder(buf);
      const messageType = decoding.readVarUint(decoder);
      if (messageType === MESSAGE_SYNC) {
        const encoder = encoding.createEncoder();
        encoding.writeVarUint(encoder, MESSAGE_SYNC);
        // readSyncMessage handles step-1 (reply with step-2) and
        // step-2 (apply update — ignored since we're authoritative).
        syncProtocol.readSyncMessage(decoder, encoder, doc, ws);
        if (encoding.length(encoder) > 1) {
          ws.send(encoding.toUint8Array(encoder));
        }
      }
    } catch (e) {
      console.error('[WS] Error handling message:', e);
    }
  });

  // -- Cleanup on close --
  const cleanup = () => {
    clients.delete(ws);
    doc.off('update', updateHandler);
  };
  ws.on('close', cleanup);
  ws.on('error', (err) => {
    console.error('[WS] Client error:', err);
    cleanup();
  });

  // -- Initial sync --
  // Step 1: send server state vector → client replies with step 2
  sendSyncStep1(ws, doc);
  // Also send the full current state immediately so the client
  // doesn't need to wait for the round-trip.
  sendFullState(ws, doc);

  console.log(`[WS] Client connected to session ${sessionId} (${playerId ? 'player' : 'host'})`);
}
