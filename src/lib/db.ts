import { PrismaClient } from "@/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
  pgPool: pg.Pool | undefined;
  prismaSchemaVersion?: number;
};

/** Bump when schema fields change so a stale HMR client is discarded. */
const PRISMA_SCHEMA_VERSION = 5;

function isTransientDbError(err: unknown): boolean {
  const message = err instanceof Error ? err.message : String(err);
  if (
    /timeout|terminated|ECONNRESET|ECONNREFUSED|EPIPE|Can't reach database|Connection terminated|too many clients|Client has encountered a connection error|Connection ended unexpectedly/i.test(
      message,
    )
  ) {
    return true;
  }
  const cause =
    err && typeof err === "object" && "cause" in err
      ? (err as { cause?: unknown }).cause
      : undefined;
  if (cause && cause !== err) return isTransientDbError(cause);
  return false;
}

/**
 * Retry once or twice when Neon / the pooler drops an idle connection.
 * Prefer this for poll endpoints so a single blip does not empty the UI.
 */
export async function withDbRetry<T>(
  fn: () => Promise<T>,
  opts?: { retries?: number; delayMs?: number },
): Promise<T> {
  const retries = opts?.retries ?? 2;
  const delayMs = opts?.delayMs ?? 500;
  let last: unknown;
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      return await fn();
    } catch (err) {
      last = err;
      if (!isTransientDbError(err) || attempt === retries) throw err;
      await new Promise((r) => setTimeout(r, delayMs * (attempt + 1)));
    }
  }
  throw last;
}

function createPool(connectionString: string) {
  // Keep the client pool small: Neon already pools via the `-pooler` host.
  // Short idle timeout avoids handing out sockets Neon already closed.
  const pool = new pg.Pool({
    connectionString,
    max: 3,
    connectionTimeoutMillis: 12_000,
    idleTimeoutMillis: 10_000,
    allowExitOnIdle: true,
    keepAlive: true,
  });
  pool.on("error", (err) => {
    console.error("[pg pool] idle client error:", err.message);
  });
  return pool;
}

function createPrismaClient() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("DATABASE_URL is not set");
  }

  const pool =
    globalForPrisma.pgPool &&
    globalForPrisma.prismaSchemaVersion === PRISMA_SCHEMA_VERSION
      ? globalForPrisma.pgPool
      : createPool(connectionString);

  if (process.env.NODE_ENV !== "production") {
    globalForPrisma.pgPool = pool;
  }

  const adapter = new PrismaPg(pool, {
    onPoolError: (err) => {
      console.error("[prisma pg] pool error:", err.message);
    },
  });

  return new PrismaClient({
    adapter,
    transactionOptions: {
      maxWait: 20_000,
      timeout: 45_000,
    },
  });
}

/** Human-readable message for common Prisma / pooler failures. */
export function prismaFailureMessage(err: unknown, fallback: string) {
  const message = err instanceof Error ? err.message : String(err);
  if (/timeout|terminated|ECONNRESET|Can't reach database/i.test(message)) {
    return "Database connection timed out. Please try again in a moment.";
  }
  const code =
    err && typeof err === "object" && "code" in err
      ? String((err as { code?: string }).code)
      : "";
  if (code === "P2002") {
    return "A record with this slug or DOI already exists.";
  }
  if (code === "P2028" || code === "P2024") {
    return "Database transaction timed out. Please try again.";
  }
  return fallback;
}

if (
  globalForPrisma.prisma &&
  globalForPrisma.prismaSchemaVersion !== PRISMA_SCHEMA_VERSION
) {
  void globalForPrisma.prisma.$disconnect().catch(() => undefined);
  void globalForPrisma.pgPool?.end().catch(() => undefined);
  globalForPrisma.prisma = undefined;
  globalForPrisma.pgPool = undefined;
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
  globalForPrisma.prismaSchemaVersion = PRISMA_SCHEMA_VERSION;
}
