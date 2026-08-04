import { prisma } from "@/lib/prisma";

/**
 * Data in this app is either personal (user_id set, group_id null) or shared
 * with a group (group_id set, user_id null). These helpers centralise the
 * membership check that every server action needs to run before touching a row.
 */

export type ScopeCheck = { ok: true } | { error: string };

export interface ScopedRow {
  user_id: string | null;
  group_id: string | null;
}

/**
 * Verify the user may write to a scope. Personal scope is always allowed;
 * a group scope requires membership.
 */
export async function assertScopeAccess(
  userId: string,
  groupId?: string | null
): Promise<ScopeCheck> {
  if (!groupId) return { ok: true };

  const membership = await prisma.group_members.findFirst({
    where: { group_id: groupId, user_id: userId },
    select: { id: true },
  });

  return membership ? { ok: true } : { error: "Unauthorized" };
}

/**
 * Verify the user may act on a row that has already been loaded.
 */
export async function assertRowAccess(
  userId: string,
  row: ScopedRow
): Promise<ScopeCheck> {
  if (row.group_id) return assertScopeAccess(userId, row.group_id);
  if (row.user_id !== userId) return { error: "Unauthorized" };
  return { ok: true };
}

/**
 * Build the `where` clause for reading rows in a single scope.
 * Without a groupId this returns the user's personal rows only.
 */
export function scopeWhere(userId: string, groupId?: string | null) {
  return groupId
    ? { group_id: groupId }
    : { user_id: userId, group_id: null };
}

/**
 * Build the ownership columns for a row being created in a scope.
 */
export function scopeOwnership(userId: string, groupId?: string | null) {
  return {
    user_id: groupId ? null : userId,
    group_id: groupId || null,
  };
}
