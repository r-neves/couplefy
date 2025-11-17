import { PrismaClient } from "./generated/prisma";

// PrismaClient is attached to the `global` object in development to prevent
// exhausting your database connection limit.
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

// Build connection URL from environment variables
const getDatabaseUrl = () => {
  if (process.env.DATABASE_URL) {
    return process.env.DATABASE_URL;
  }

  const user = process.env.POSTGRES_USER || "couplefy_user";
  const password = process.env.POSTGRES_PASSWORD || "couplefy_password";
  const host = process.env.POSTGRES_HOST || "localhost";
  const port = process.env.POSTGRES_PORT || "5432";
  const database = process.env.POSTGRES_DB || "couplefy_db";

  return `postgresql://${user}:${password}@${host}:${port}/${database}`;
};

const prismaClientSingleton = () => {
  return new PrismaClient({
    datasources: {
      db: {
        url: getDatabaseUrl(),
      },
    },
    log:
      process.env.NODE_ENV === "development"
        ? ["query", "error", "warn"]
        : ["error"],
  });
};

export const prisma = globalForPrisma.prisma ?? prismaClientSingleton();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;

/**
 * Warm up the database connection pool
 * This can be called in parallel with other operations to reduce latency
 * Returns a promise that resolves when the connection is established
 */
export async function warmupPrismaConnection(): Promise<void> {
  try {
    // Execute a lightweight query to establish connection
    await prisma.$queryRaw`SELECT 1`;
  } catch (error) {
    // Log error but don't throw - connection will be retried on next query
    console.error("Failed to warm up Prisma connection:", error);
  }
}
