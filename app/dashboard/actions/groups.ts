"use server";

import { createClient } from "@/lib/supabase/server";
import { db } from "@/lib/db";
import { groups, groupMembers, invites, users } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { revalidatePath } from "next/cache";

function generateInviteCode(): string {
  return Math.random().toString(36).substring(2, 10).toUpperCase();
}

export async function createGroup(formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Not authenticated" };
  }

  const name = formData.get("name") as string;

  if (!name || name.trim().length === 0) {
    return { error: "Group name is required" };
  }

  try {
    // Get user from our database
    const dbUser = await db.query.users.findFirst({
      where: eq(users.supabaseId, user.id),
    });

    if (!dbUser) {
      return { error: "User not found in database" };
    }

    // Create the group
    const [group] = await db.insert(groups).values({
      name: name.trim(),
      createdBy: dbUser.id,
    }).returning();

    // Add creator as first member
    await db.insert(groupMembers).values({
      groupId: group.id,
      userId: dbUser.id,
    });

    revalidatePath("/dashboard");
    return { success: true, groupId: group.id };
  } catch (error) {
    console.error("Error creating group:", error);
    return { error: "Failed to create group" };
  }
}

export async function generateInvite(groupId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Not authenticated" };
  }

  try {
    // Get user from our database
    const dbUser = await db.query.users.findFirst({
      where: eq(users.supabaseId, user.id),
    });

    if (!dbUser) {
      return { error: "User not found in database" };
    }

    // Verify user is a member of the group
    const membership = await db.query.groupMembers.findFirst({
      where: and(
        eq(groupMembers.groupId, groupId),
        eq(groupMembers.userId, dbUser.id)
      ),
    });

    if (!membership) {
      return { error: "You are not a member of this group" };
    }

    // Generate unique invite code
    const inviteCode = generateInviteCode();

    // Create invite (expires in 7 days)
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    const [invite] = await db.insert(invites).values({
      groupId,
      invitedBy: dbUser.id,
      inviteCode,
      expiresAt,
    }).returning();

    return { success: true, inviteCode: invite.inviteCode };
  } catch (error) {
    console.error("Error generating invite:", error);
    return { error: "Failed to generate invite" };
  }
}

export async function acceptInvite(inviteCode: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Not authenticated" };
  }

  try {
    // Get user from our database
    const dbUser = await db.query.users.findFirst({
      where: eq(users.supabaseId, user.id),
    });

    if (!dbUser) {
      return { error: "User not found in database" };
    }

    // Find the invite
    const invite = await db.query.invites.findFirst({
      where: and(
        eq(invites.inviteCode, inviteCode.toUpperCase()),
        eq(invites.status, "pending")
      ),
      with: {
        group: true,
      },
    });

    if (!invite) {
      return { error: "Invalid or expired invite code" };
    }

    // Check if invite is expired
    if (new Date() > invite.expiresAt) {
      await db.update(invites)
        .set({ status: "expired" })
        .where(eq(invites.id, invite.id));
      return { error: "This invite has expired" };
    }

    // Check if user is already a member
    const existingMembership = await db.query.groupMembers.findFirst({
      where: and(
        eq(groupMembers.groupId, invite.groupId),
        eq(groupMembers.userId, dbUser.id)
      ),
    });

    if (existingMembership) {
      return { error: "You are already a member of this group" };
    }

    // Add user to group
    await db.insert(groupMembers).values({
      groupId: invite.groupId,
      userId: dbUser.id,
    });

    // Update invite status
    await db.update(invites)
      .set({ status: "accepted" })
      .where(eq(invites.id, invite.id));

    revalidatePath("/dashboard");
    return { success: true, groupName: invite.group.name };
  } catch (error) {
    console.error("Error accepting invite:", error);
    return { error: "Failed to accept invite" };
  }
}

export async function getUserGroups() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Not authenticated" };
  }

  try {
    // Get user from our database
    const dbUser = await db.query.users.findFirst({
      where: eq(users.supabaseId, user.id),
    });

    if (!dbUser) {
      return { error: "User not found in database" };
    }

    // Get all groups the user is a member of
    const userGroupMemberships = await db.query.groupMembers.findMany({
      where: eq(groupMembers.userId, dbUser.id),
      with: {
        group: {
          with: {
            members: {
              with: {
                user: true,
              },
            },
          },
        },
      },
    });

    return {
      success: true,
      groups: userGroupMemberships.map(m => m.group)
    };
  } catch (error) {
    console.error("Error getting user groups:", error);
    return { error: "Failed to get groups" };
  }
}
