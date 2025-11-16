import { prisma } from "@/lib/prisma";

/**
 * Get all group IDs that a user is a member of.
 * This is a common query used across multiple action files.
 * By extracting it, we can call it once and pass the result to multiple functions
 * when they're executed in parallel, avoiding duplicate queries.
 */
export async function getUserGroupIds(userId: string): Promise<string[]> {
  const userGroupMemberships = await prisma.group_members.findMany({
    where: { user_id: userId },
    select: { group_id: true },
  });

  return userGroupMemberships.map(gm => gm.group_id);
}
