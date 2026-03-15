import { createServer as createHttpServer, IncomingMessage, ServerResponse } from "node:http";
import { readFile } from "node:fs/promises";
import { join, extname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { WebSocketServer, WebSocket } from "ws";
import type { DuelState } from "./renderer.js";

// ─── MIME types ──────────────────────────────────────────────

const MIME: Record<string, string> = {
  ".html": "text/html",
  ".css": "text/css",
  ".js": "application/javascript",
  ".json": "application/json",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
};

// ─── Static file server ─────────────────────────────────────

const WEB_DIR = join(fileURLToPath(import.meta.url), "../../web");

async function serveStatic(req: IncomingMessage, res: ServerResponse): Promise<void> {
  const urlPath = req.url === "/" ? "/index.html" : req.url ?? "/index.html";

  // Prevent directory traversal — resolve and verify prefix
  let decoded: string;
  try {
    decoded = decodeURIComponent(urlPath);
  } catch {
    res.writeHead(400, { "Content-Type": "text/plain" });
    res.end("Bad request");
    return;
  }
  const safePath = resolve(WEB_DIR, "." + decoded);
  if (!safePath.startsWith(WEB_DIR)) {
    res.writeHead(403, { "Content-Type": "text/plain" });
    res.end("Forbidden");
    return;
  }

  try {
    const data = await readFile(safePath);
    const ext = extname(safePath);
    res.writeHead(200, { "Content-Type": MIME[ext] ?? "application/octet-stream" });
    res.end(data);
  } catch {
    res.writeHead(404, { "Content-Type": "text/plain" });
    res.end("Not found");
  }
}

// ─── Bet message validation ─────────────────────────────────

interface BetMessage {
  type: "bet";
  side: "X" | "O";
  amount: number;
  name: string;
}

function isValidBet(data: unknown): data is BetMessage {
  if (typeof data !== "object" || data === null) return false;
  const d = data as Record<string, unknown>;
  return (
    d.type === "bet" &&
    (d.side === "X" || d.side === "O") &&
    typeof d.amount === "number" &&
    d.amount > 0 &&
    typeof d.name === "string" &&
    d.name.length > 0
  );
}

// ─── Public API ─────────────────────────────────────────────

export interface DuelServer {
  broadcast(state: DuelState): void;
  onBet(callback: (bet: { name: string; side: string; amount: number }) => void): void;
  clearBetHandlers(): void;
  getSpectatorCount(): number;
  shouldStart(): boolean;
  shouldStop(): boolean;
  clearStartFlag(): void;
  clearStopFlag(): void;
  close(): void;
}

export function createServer(port: number): DuelServer {
  let latestState: DuelState | null = null;
  let adminStartFlag = false;
  let adminStopFlag = false;

  function checkAdminAuth(req: IncomingMessage, res: ServerResponse): boolean {
    const token = process.env.ADMIN_TOKEN;
    if (token) {
      const auth = req.headers.authorization;
      if (auth !== `Bearer ${token}`) {
        res.writeHead(401, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: "unauthorized" }));
        return false;
      }
    }
    return true;
  }

  const httpServer = createHttpServer((req, res) => {
    // Admin API: force-start a round
    if (req.method === "POST" && req.url === "/api/start") {
      if (!checkAdminAuth(req, res)) return;
      adminStartFlag = true;
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ status: "starting" }));
      return;
    }

    // Admin API: signal stop after current round
    if (req.method === "POST" && req.url === "/api/stop") {
      if (!checkAdminAuth(req, res)) return;
      adminStopFlag = true;
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ status: "stopping" }));
      return;
    }

    if (req.method === "GET" && req.url === "/health") {
      const body = JSON.stringify({
        status: "ok",
        spectators: wss.clients.size,
        uptime: process.uptime(),
      });
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(body);
      return;
    }

    if (req.method === "GET" && req.url === "/api/state") {
      const body = latestState !== null
        ? JSON.stringify(latestState)
        : JSON.stringify(null);
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(body);
      return;
    }

    serveStatic(req, res);
  });

  const wss = new WebSocketServer({ server: httpServer });

  const betHandlers: Array<(bet: { name: string; side: string; amount: number }) => void> = [];

  wss.on("connection", (ws: WebSocket) => {
    ws.on("message", (raw: Buffer | string) => {
      try {
        const msg = JSON.parse(typeof raw === "string" ? raw : raw.toString());
        if (isValidBet(msg)) {
          for (const handler of betHandlers) {
            handler({ name: msg.name, side: msg.side, amount: msg.amount });
          }
        }
      } catch {
        // Ignore malformed messages
      }
    });
  });

  httpServer.listen(port);

  return {
    broadcast(state: DuelState): void {
      latestState = state;
      const payload = JSON.stringify({
        ...state,
        spectatorCount: wss.clients.size,
      });
      for (const client of wss.clients) {
        if (client.readyState === WebSocket.OPEN) {
          client.send(payload);
        }
      }
    },

    onBet(callback) {
      betHandlers.push(callback);
    },

    clearBetHandlers() {
      betHandlers.length = 0;
    },

    getSpectatorCount(): number {
      return wss.clients.size;
    },

    shouldStart(): boolean {
      return adminStartFlag;
    },

    shouldStop(): boolean {
      return adminStopFlag;
    },

    clearStartFlag(): void {
      adminStartFlag = false;
    },

    clearStopFlag(): void {
      adminStopFlag = false;
    },

    close(): void {
      for (const client of wss.clients) {
        client.close();
      }
      wss.close();
      httpServer.close();
    },
  };
}
