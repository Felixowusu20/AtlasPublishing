import { PrismaClient } from "@/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
  prismaSchemaVersion?: number;
};

/** Bump when schema fields change so a stale HMR client is discarded. */
const PRISMA_SCHEMA_VERSION = 4;

function createPrismaClient() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("DATABASE_URL is not set");
  }

  // Neon over the pooler can be slow to hand out a connection after idling,
  // which otherwise surfaces as Prisma P2028 when a transaction starts.
  const adapter = new PrismaPg({
    connectionString,
    max: 5,
    connectionTimeoutMillis: 30_000,
    idleTimeoutMillis: 20_000,
    keepAlive: true,
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
  globalForPrisma.prisma = undefined;
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
  globalForPrisma.prismaSchemaVersion = PRISMA_SCHEMA_VERSION;
}
