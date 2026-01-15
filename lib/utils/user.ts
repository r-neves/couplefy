import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";

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

/**
 * Get the full database user profile from a Supabase user ID
 * Returns null if user is not found
 */
export async function getDbUserWithStatus(supabaseUserId: string) {
  const dbUser = await prisma.users.findUnique({
    where: { supabase_id: supabaseUserId },
    select: {
      id: true,
      role: true,
      status: true,
      email: true,
      name: true,
    },
  });

  return dbUser;
}

/**
 * Get the authenticated user's database ID
 * Returns error object if not authenticated or user not found in database
 * This is a common pattern used in server actions
 */
export async function getAuthenticatedUserId(): Promise<{ userId: string } | { error: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) return { error: "Not authenticated" };
  
  const userId = await getDbUserId(user.id);
  if (!userId) return { error: "User not found" };
  
  return { userId };
}
