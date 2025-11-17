"use server";

import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { getDbUserId } from "@/lib/utils/user";

function generateInviteCode(): string {
  return Math.random().toString(36).substring(2, 10).toUpperCase();
}

export async function createGroup(formData: FormData, userId: string) {
  const name = formData.get("name") as string;

  if (!name || name.trim().length === 0) {
    return { error: "Group name is required" };
  }

  try {
    // Create the group and add creator as first member in a transaction
    const group = await prisma.groups.create({
      data: {
        name: name.trim(),
        created_by: userId,
        group_members: {
          create: {
            user_id: userId,
          },
        },
      },
    });

    revalidatePath("/dashboard");
    return { success: true, groupId: group.id };
  } catch (error) {
    console.error("Error creating group:", error);
    return { error: "Failed to create group" };
  }
}

export async function generateInvite(groupId: string, userId: string) {
  try {
    // Verify user is a member of the group
    const membership = await prisma.group_members.findFirst({
      where: {
        group_id: groupId,
        user_id: userId,
      },
    });

    if (!membership) {
      return { error: "You are not a member of this group" };
    }

    // Generate unique invite code
    const inviteCode = generateInviteCode();

    // Create invite (expires in 7 days)
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    const invite = await prisma.invites.create({
      data: {
        group_id: groupId,
        invited_by: userId,
        invite_code: inviteCode,
        expires_at: expiresAt,
      },
    });

    return { success: true, inviteCode: invite.invite_code };
  } catch (error) {
    console.error("Error generating invite:", error);
    return { error: "Failed to generate invite" };
  }
}

export async function acceptInvite(inviteCode: string, userId: string) {
  try {
    // Find the invite
    const invite = await prisma.invites.findFirst({
      where: {
        invite_code: inviteCode.toUpperCase(),
        status: "pending",
      },
      include: {
        groups: true,
      },
    });

    if (!invite) {
      return { error: "Invalid or expired invite code" };
    }

    // Check if invite is expired
    if (new Date() > invite.expires_at) {
      await prisma.invites.update({
        where: { id: invite.id },
        data: { status: "expired" },
      });
      return { error: "This invite has expired" };
    }

    // Check if user is already a member
    const existingMembership = await prisma.group_members.findFirst({
      where: {
        group_id: invite.group_id,
        user_id: userId,
      },
    });

    if (existingMembership) {
      return { error: "You are already a member of this group" };
    }

    // Add user to group and update invite status in a transaction
    await prisma.$transaction([
      prisma.group_members.create({
        data: {
          group_id: invite.group_id,
          user_id: userId,
        },
      }),
      prisma.invites.update({
        where: { id: invite.id },
        data: { status: "accepted" },
      }),
    ]);

    revalidatePath("/dashboard");
    return { success: true, groupName: invite.groups.name };
  } catch (error) {
    console.error("Error accepting invite:", error);
    return { error: "Failed to accept invite" };
  }
}

export async function getUserGroups(userId: string) {
  try {
    // Get all groups the user is a member of
    const userGroupMemberships = await prisma.group_members.findMany({
      where: { user_id: userId },
      include: {
        groups: {
          include: {
            group_members: {
              include: {
                users: true,
              },
            },
          },
        },
      },
    });

    // Transform to match the expected format
    const groups = userGroupMemberships.map((membership) => ({
      id: membership.groups.id,
      name: membership.groups.name,
      createdBy: membership.groups.created_by,
      createdAt: membership.groups.created_at,
      updatedAt: membership.groups.updated_at,
      members: membership.groups.group_members.map((member) => ({
        id: member.id,
        groupId: member.group_id,
        userId: member.user_id,
        joinedAt: member.joined_at,
        user: {
          id: member.users.id,
          email: member.users.email,
          name: member.users.name,
          avatarUrl: member.users.avatar_url,
          supabaseId: member.users.supabase_id,
          createdAt: member.users.created_at,
          updatedAt: member.users.updated_at,
        },
      })),
    }));

    return {
      success: true,
      groups,
    };
  } catch (error) {
    console.error("Error getting user groups:", error);
    return { error: "Failed to get groups" };
  }
}

// Client-facing wrapper functions that fetch userId automatically
// These are used by client components that can't pass userId directly

export async function createGroupFromClient(formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Not authenticated" };
  }

  const userId = await getDbUserId(user.id);
  if (!userId) {
    return { error: "User not found in database" };
  }

  return createGroup(formData, userId);
}

export async function generateInviteFromClient(groupId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Not authenticated" };
  }

  const userId = await getDbUserId(user.id);
  if (!userId) {
    return { error: "User not found in database" };
  }

  return generateInvite(groupId, userId);
}

export async function acceptInviteFromClient(inviteCode: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Not authenticated" };
  }

  const userId = await getDbUserId(user.id);
  if (!userId) {
    return { error: "User not found in database" };
  }

  return acceptInvite(inviteCode, userId);
}

export async function updateGroupName(groupId: string, newName: string, userId: string) {
  if (!newName || newName.trim().length === 0) {
    return { error: "Group name is required" };
  }

  try {
    // Verify user is a member of the group
    const membership = await prisma.group_members.findFirst({
      where: {
        group_id: groupId,
        user_id: userId,
      },
    });

    if (!membership) {
      return { error: "You are not a member of this group" };
    }

    // Update group name
    await prisma.groups.update({
      where: { id: groupId },
      data: { name: newName.trim() },
    });

    revalidatePath("/dashboard");
    return { success: true };
  } catch (error) {
    console.error("Error updating group name:", error);
    return { error: "Failed to update group name" };
  }
}

export async function updateGroupNameFromClient(groupId: string, newName: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Not authenticated" };
  }

  const userId = await getDbUserId(user.id);
  if (!userId) {
    return { error: "User not found in database" };
  }

  return updateGroupName(groupId, newName, userId);
}

export async function removeMemberFromGroup(groupId: string, memberUserId: string, requestingUserId: string) {
  try {
    // Verify requesting user is a member of the group
    const requestingMembership = await prisma.group_members.findFirst({
      where: {
        group_id: groupId,
        user_id: requestingUserId,
      },
    });

    if (!requestingMembership) {
      return { error: "You are not a member of this group" };
    }

    // Get group info to check if the member being removed is the creator
    const group = await prisma.groups.findUnique({
      where: { id: groupId },
      include: {
        group_members: true,
      },
    });

    if (!group) {
      return { error: "Group not found" };
    }

    // Don't allow removing the creator if there are other members
    if (group.created_by === memberUserId && group.group_members.length > 1) {
      return { error: "Cannot remove the group creator while other members exist" };
    }

    // Remove the member
    await prisma.group_members.deleteMany({
      where: {
        group_id: groupId,
        user_id: memberUserId,
      },
    });

    // If the last member was removed, delete the group
    const remainingMembers = await prisma.group_members.count({
      where: { group_id: groupId },
    });

    if (remainingMembers === 0) {
      await prisma.groups.delete({
        where: { id: groupId },
      });
    }

    revalidatePath("/dashboard");
    return { success: true };
  } catch (error) {
    console.error("Error removing member from group:", error);
    return { error: "Failed to remove member" };
  }
}

export async function removeMemberFromGroupFromClient(groupId: string, memberUserId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Not authenticated" };
  }

  const userId = await getDbUserId(user.id);
  if (!userId) {
    return { error: "User not found in database" };
  }

  return removeMemberFromGroup(groupId, memberUserId, userId);
}
