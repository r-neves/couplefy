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
    datasourceUrl: getDatabaseUrl(),
    log:
      process.env.NODE_ENV === "development"
        ? ["query", "error", "warn"]
        : ["error"],
    // Optimize for serverless/edge environments
    ...(process.env.NODE_ENV === "production" && {
      // Reduce connection pool size for serverless (Vercel/serverless functions)
      // Each function instance gets its own connection pool
      datasources: {
        db: {
          url: getDatabaseUrl(),
        },
      },
    }),
  });
};

export const prisma = globalForPrisma.prisma ?? prismaClientSingleton();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
