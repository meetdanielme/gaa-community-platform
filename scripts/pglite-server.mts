/**
 * Local development database: PGlite (Postgres compiled to WebAssembly)
 * served over the Postgres wire protocol. Data lives in .data/pglite.
 *
 * One process owns the database files, so the Next.js dev server — which
 * runs routes in several worker processes — can safely connect to it like
 * any other Postgres. No Docker or cloud account needed.
 */
import { mkdirSync } from "node:fs";
import { PGlite } from "@electric-sql/pglite";
import { PGLiteSocketServer } from "@electric-sql/pglite-socket";

export const PGLITE_PORT = 54329;

/** Frontend messages that end a request cycle: Sync, Query, Terminate. */
const CYCLE_END = new Set(["S", "Q", "X"].map((c) => c.charCodeAt(0)));

function endsRequestCycle(message: Uint8Array) {
  // The startup packet has no type byte (it begins with a length).
  if (message.length < 5 || message[0] === 0) return true;
  const view = new DataView(message.buffer, message.byteOffset, message.byteLength);
  let offset = 0;
  let lastType = 0;
  while (offset + 5 <= message.length) {
    lastType = message[offset];
    offset += 1 + view.getInt32(offset + 1);
  }
  return offset !== message.length || CYCLE_END.has(lastType);
}

/**
 * pglite-socket multiplexes many clients over PGlite's single connection and
 * keeps a client pinned only while it is inside a transaction. Clients like
 * postgres.js send Parse/Bind/Execute/Sync as separate messages, so another
 * client could slip in between and replace the unnamed prepared statement.
 * We also report "in transaction" until the pinned client's Sync, which keeps
 * each extended-protocol request cycle together.
 */
export function withRequestCyclePinning(db: PGlite): PGlite {
  let midCycle = false;
  return new Proxy(db, {
    get(target, prop, receiver) {
      if (prop === "isInTransaction") return () => target.isInTransaction() || midCycle;
      if (prop === "execProtocolRawStream") {
        return (message: Uint8Array, options: unknown) => {
          midCycle = !endsRequestCycle(message);
          return target.execProtocolRawStream(message, options as never);
        };
      }
      const value = Reflect.get(target, prop, receiver);
      return typeof value === "function" ? value.bind(target) : value;
    },
  });
}

export async function startPgliteServer({
  dataDir = ".data/pglite",
  port = PGLITE_PORT,
}: { dataDir?: string; port?: number } = {}) {
  if (!dataDir.startsWith("memory://")) mkdirSync(".data", { recursive: true });
  const db = await PGlite.create(dataDir);
  const server = new PGLiteSocketServer({
    db: withRequestCyclePinning(db),
    port,
    host: "127.0.0.1",
    maxConnections: 32,
  });
  try {
    await server.start();
  } catch (err) {
    await db.close();
    if ((err as NodeJS.ErrnoException).code === "EADDRINUSE") {
      throw new Error(`Port ${port} is in use — is another \`pnpm dev\` or \`pnpm db:server\` already running?`);
    }
    throw err;
  }
  return {
    url: `postgres://postgres:postgres@127.0.0.1:${port}/postgres`,
    async stop() {
      await server.stop();
      await db.close();
    },
  };
}

// `pnpm db:server` — run the database on its own (e.g. for Drizzle Studio).
if (import.meta.url === `file://${process.argv[1]}`) {
  const { stop } = await startPgliteServer();
  console.log(`✓ PGlite listening on 127.0.0.1:${PGLITE_PORT} (Ctrl+C to stop)`);
  const shutdown = () => stop().finally(() => process.exit(0));
  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
}
