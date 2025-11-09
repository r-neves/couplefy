import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

// Use DATABASE_URL if available (for connection pooling), otherwise build from parts
const connectionString = process.env.DATABASE_URL || 
  `postgresql://${process.env.POSTGRES_USER || "couplefy_user"}:${process.env.POSTGRES_PASSWORD || "couplefy_password"}@${process.env.POSTGRES_HOST || "localhost"}:${process.env.POSTGRES_PORT || "5432"}/${process.env.POSTGRES_DB || "couplefy_db"}`;

// For serverless/edge environments (Vercel), use connection pooling
const client = postgres(connectionString, { 
  prepare: false,
  ssl: process.env.NODE_ENV === "production" ? { rejectUnauthorized: false } : false,
  max: 1, // Limit connections in serverless
});

export const db = drizzle(client, { schema });
