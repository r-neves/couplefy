"use server";

import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { getDbUserId } from "@/lib/utils/user";
import { getUserGroupIds } from "@/lib/utils/groups";

// Core functions that accept userId directly

export async function createSaving(formData: FormData, userId: string) {
  const amount = formData.get("amount") as string;
  const goalId = formData.get("goalId") as string;
  const description = formData.get("description") as string || null;
  const date = formData.get("date") as string;
  const groupId = formData.get("groupId") as string || null;
  const paidById = formData.get("paidById") as string || null;

  if (!amount || !goalId || !date) {
    return { error: "Amount, goal, and date are required" };
  }

  try {
    // For group savings, use paidById if provided, otherwise use current user
    // For personal savings, always use current user
    const savingUserId = groupId && paidById ? paidById : userId;

    const saving = await prisma.savings.create({
      data: {
        user_id: savingUserId,
        group_id: groupId || null,
        goal_id: goalId,
        amount,
        description,
        date: new Date(date),
      },
    });

    revalidatePath("/dashboard");
    return { success: true, savingId: saving.id };
  } catch (error) {
    console.error("Error creating saving:", error);
    return { error: "Failed to create saving" };
  }
}

export async function updateSaving(savingId: string, formData: FormData, userId: string) {
  const amount = formData.get("amount") as string;
  const goalId = formData.get("goalId") as string;
  const description = formData.get("description") as string || null;
  const date = formData.get("date") as string;

  if (!amount || !goalId || !date) {
    return { error: "Amount, goal, and date are required" };
  }

  try {
    // Verify ownership
    const saving = await prisma.savings.findUnique({
      where: { id: savingId },
    });

    if (!saving || saving.user_id !== userId) {
      return { error: "Saving not found or unauthorized" };
    }

    await prisma.savings.update({
      where: { id: savingId },
      data: {
        amount,
        goal_id: goalId,
        description,
        date: new Date(date),
        updated_at: new Date(),
      },
    });

    revalidatePath("/dashboard");
    return { success: true };
  } catch (error) {
    console.error("Error updating saving:", error);
    return { error: "Failed to update saving" };
  }
}

export async function deleteSaving(savingId: string, userId: string) {
  try {
    // Verify ownership
    const saving = await prisma.savings.findUnique({
      where: { id: savingId },
    });

    if (!saving || saving.user_id !== userId) {
      return { error: "Saving not found or unauthorized" };
    }

    await prisma.savings.delete({
      where: { id: savingId },
    });

    revalidatePath("/dashboard");
    return { success: true };
  } catch (error) {
    console.error("Error deleting saving:", error);
    return { error: "Failed to delete saving" };
  }
}

export async function getSavings(userId: string, params?: {
  groupId?: string;
  startDate?: Date;
  endDate?: Date;
  userGroupIds?: string[]; // Optional: pass in to avoid duplicate queries
}) {
  try {
    // Get all groups the user is a member of (or use provided userGroupIds)
    const userGroupIds = params?.userGroupIds ?? await getUserGroupIds(userId);

    // Build where condition
    const whereCondition: any = {};

    if (params?.groupId) {
      // Filter by specific group
      whereCondition.group_id = params.groupId;
    } else {
      // Get personal savings OR shared savings from user's groups
      if (userGroupIds.length > 0) {
        whereCondition.OR = [
          // Personal savings (no groupId, created by user)
          { user_id: userId, group_id: null },
          // Shared savings (in any of user's groups)
          { group_id: { in: userGroupIds } },
        ];
      } else {
        // User has no groups, only show personal savings
        whereCondition.user_id = userId;
        whereCondition.group_id = null;
      }
    }

    // Add date filters
    if (params?.startDate || params?.endDate) {
      whereCondition.date = {};
      if (params.startDate) {
        whereCondition.date.gte = params.startDate;
      }
      if (params.endDate) {
        whereCondition.date.lte = params.endDate;
      }
    }

    const userSavings = await prisma.savings.findMany({
      where: whereCondition,
      include: {
        goals: true,
        groups: true,
        users: true,
      },
      orderBy: { date: "desc" },
    });

    // Transform to match expected format
    const savings = userSavings.map((saving) => ({
      id: saving.id,
      userId: saving.user_id,
      groupId: saving.group_id,
      goalId: saving.goal_id,
      amount: saving.amount.toString(),
      description: saving.description,
      date: saving.date,
      createdAt: saving.created_at,
      updatedAt: saving.updated_at,
      goal: {
        id: saving.goals.id,
        userId: saving.goals.user_id,
        groupId: saving.goals.group_id,
        name: saving.goals.name,
        targetAmount: saving.goals.target_amount?.toString() || null,
        color: saving.goals.color,
        icon: saving.goals.icon,
        description: saving.goals.description,
        createdAt: saving.goals.created_at,
        updatedAt: saving.goals.updated_at,
      },
      group: saving.groups
        ? {
            id: saving.groups.id,
            name: saving.groups.name,
            createdBy: saving.groups.created_by,
            createdAt: saving.groups.created_at,
            updatedAt: saving.groups.updated_at,
          }
        : null,
      user: {
        id: saving.users.id,
        email: saving.users.email,
        name: saving.users.name,
        avatarUrl: saving.users.avatar_url,
        supabaseId: saving.users.supabase_id,
        createdAt: saving.users.created_at,
        updatedAt: saving.users.updated_at,
      },
    }));

    return { success: true, savings };
  } catch (error) {
    console.error("Error getting savings:", error);
    return { error: "Failed to get savings" };
  }
}

// Client-facing wrapper functions that fetch userId automatically

export async function createSavingFromClient(formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Not authenticated" };
  }

  const userId = await getDbUserId(user.id);
  if (!userId) {
    return { error: "User not found in database" };
  }

  return createSaving(formData, userId);
}

export async function updateSavingFromClient(savingId: string, formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Not authenticated" };
  }

  const userId = await getDbUserId(user.id);
  if (!userId) {
    return { error: "User not found in database" };
  }

  return updateSaving(savingId, formData, userId);
}

export async function deleteSavingFromClient(savingId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Not authenticated" };
  }

  const userId = await getDbUserId(user.id);
  if (!userId) {
    return { error: "User not found in database" };
  }

  return deleteSaving(savingId, userId);
}

export async function getSavingsFromClient(params?: {
  groupId?: string;
  startDate?: Date;
  endDate?: Date;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Not authenticated" };
  }

  const userId = await getDbUserId(user.id);
  if (!userId) {
    return { error: "User not found in database" };
  }

  return getSavings(userId, params);
}
