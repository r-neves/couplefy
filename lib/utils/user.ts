import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

/**
 * Get the database user ID from a Supabase user ID
 * Returns null if user is not found
 */
export async function getDbUserId(supabaseUserId: string): Promise<string | null> {
  const dbUser = await db.query.users.findFirst({
    where: eq(users.supabaseId, supabaseUserId),
  });

  return dbUser?.id ?? null;
}
