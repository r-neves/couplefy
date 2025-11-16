import { prisma } from "@/lib/prisma";

/**
 * Get the database user ID from a Supabase user ID
 * Returns null if user is not found
 */
export async function getDbUserId(supabaseUserId: string): Promise<string | null> {
  const dbUser = await prisma.users.findUnique({
    where: { supabase_id: supabaseUserId },
    select: { id: true },
  });

  return dbUser?.id ?? null;
}
