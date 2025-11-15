import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";
import { trace, SpanStatusCode } from "@opentelemetry/api";

// Use DATABASE_URL if available (for connection pooling), otherwise build from parts
const connectionString = process.env.DATABASE_URL ||
  `postgresql://${process.env.POSTGRES_USER || "couplefy_user"}:${process.env.POSTGRES_PASSWORD || "couplefy_password"}@${process.env.POSTGRES_HOST || "localhost"}:${process.env.POSTGRES_PORT || "5432"}/${process.env.POSTGRES_DB || "couplefy_db"}`;

// For serverless/edge environments (Vercel), use connection pooling
const client = postgres(connectionString, {
  prepare: false,
  ssl: process.env.NODE_ENV === "production" ? { rejectUnauthorized: false } : false,
  max: 15, // Limit connections in serverless
  debug: (_connection, query, _params) => {
    // Only trace if OTEL is enabled
    if (process.env.OTEL_ENABLED !== 'true' && process.env.NODE_ENV !== 'production') {
      return;
    }

    const tracer = trace.getTracer('couplefy-db');
    const span = tracer.startSpan('db.query', {
      attributes: {
        'db.system': 'postgresql',
        'db.statement': query,
        'db.operation': query.split(' ')[0]?.toUpperCase() || 'UNKNOWN',
      },
    });

    // End the span immediately since debug is called after query execution
    span.setStatus({ code: SpanStatusCode.OK });
    span.end();
  },
});

export const db = drizzle(client, { schema });
