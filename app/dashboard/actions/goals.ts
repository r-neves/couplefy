"use server";

import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { getDbUserId } from "@/lib/utils/user";
import { getUserGroupIds } from "@/lib/utils/groups";

// Core functions that accept userId directly

export async function createGoal(formData: FormData, userId: string) {
  const name = formData.get("name") as string;
  const targetAmount = formData.get("targetAmount") as string || null;
  const color = formData.get("color") as string || "#10b981";
  const icon = formData.get("icon") as string || null;
  const description = formData.get("description") as string || null;
  const groupId = formData.get("groupId") as string || null;

  if (!name) {
    return { error: "Goal name is required" };
  }

  try {
    // If groupId is provided, verify user is a member
    if (groupId) {
      const membership = await prisma.group_members.findFirst({
        where: {
          group_id: groupId,
          user_id: userId,
        },
      });

      if (!membership) {
        return { error: "You are not a member of this group" };
      }
    }

    const goal = await prisma.goals.create({
      data: {
        user_id: groupId ? null : userId, // Group goals don't have a userId
        group_id: groupId || null,
        name,
        target_amount: targetAmount,
        color,
        icon,
        description,
      },
    });

    revalidatePath("/dashboard");
    return { success: true, goalId: goal.id };
  } catch (error) {
    console.error("Error creating goal:", error);
    return { error: "Failed to create goal" };
  }
}

export async function updateGoal(goalId: string, formData: FormData, userId: string) {
  const name = formData.get("name") as string;
  const targetAmount = formData.get("targetAmount") as string || null;
  const color = formData.get("color") as string || "#10b981";
  const icon = formData.get("icon") as string || null;
  const description = formData.get("description") as string || null;

  if (!name) {
    return { error: "Goal name is required" };
  }

  try {
    // Verify ownership or group membership
    const goal = await prisma.goals.findUnique({
      where: { id: goalId },
    });

    if (!goal) {
      return { error: "Goal not found" };
    }

    // Check if user has permission to edit
    if (goal.user_id && goal.user_id !== userId) {
      return { error: "Unauthorized" };
    }

    if (goal.group_id) {
      const membership = await prisma.group_members.findFirst({
        where: {
          group_id: goal.group_id,
          user_id: userId,
        },
      });

      if (!membership) {
        return { error: "Unauthorized" };
      }
    }

    await prisma.goals.update({
      where: { id: goalId },
      data: {
        name,
        target_amount: targetAmount,
        color,
        icon,
        description,
        updated_at: new Date(),
      },
    });

    revalidatePath("/dashboard");
    return { success: true };
  } catch (error) {
    console.error("Error updating goal:", error);
    return { error: "Failed to update goal" };
  }
}

export async function deleteGoal(goalId: string, userId: string) {
  try {
    // Verify ownership or group membership
    const goal = await prisma.goals.findUnique({
      where: { id: goalId },
    });

    if (!goal) {
      return { error: "Goal not found" };
    }

    // Check if user has permission to delete
    if (goal.user_id && goal.user_id !== userId) {
      return { error: "Unauthorized" };
    }

    if (goal.group_id) {
      const membership = await prisma.group_members.findFirst({
        where: {
          group_id: goal.group_id,
          user_id: userId,
        },
      });

      if (!membership) {
        return { error: "Unauthorized" };
      }
    }

    await prisma.goals.delete({
      where: { id: goalId },
    });

    revalidatePath("/dashboard");
    return { success: true };
  } catch (error) {
    console.error("Error deleting goal:", error);
    return { error: "Failed to delete goal" };
  }
}

export async function getUserGoals(userId: string, userGroupIds?: string[]) {
  try {
    // Get all groups the user is a member of (or use provided userGroupIds)
    const groupIds = userGroupIds ?? await getUserGroupIds(userId);

    // Get personal goals and goals from user's groups
    const userGoals = await prisma.goals.findMany({
      where: {
        OR: [
          { user_id: userId },
          { group_id: { in: groupIds } },
        ],
      },
      include: {
        groups: true,
      },
      orderBy: { created_at: "desc" },
    });

    // Transform to match expected format
    const goals = userGoals.map((goal) => ({
      id: goal.id,
      userId: goal.user_id,
      groupId: goal.group_id,
      name: goal.name,
      targetAmount: goal.target_amount?.toString() || null,
      color: goal.color,
      icon: goal.icon,
      description: goal.description,
      createdAt: goal.created_at,
      updatedAt: goal.updated_at,
      group: goal.groups
        ? {
            id: goal.groups.id,
            name: goal.groups.name,
            createdBy: goal.groups.created_by,
            createdAt: goal.groups.created_at,
            updatedAt: goal.groups.updated_at,
          }
        : null,
    }));

    return { success: true, goals };
  } catch (error) {
    console.error("Error getting goals:", error);
    return { error: "Failed to get goals" };
  }
}

// Client-facing wrapper functions that fetch userId automatically

export async function createGoalFromClient(formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Not authenticated" };
  }

  const userId = await getDbUserId(user.id);
  if (!userId) {
    return { error: "User not found in database" };
  }

  return createGoal(formData, userId);
}

export async function updateGoalFromClient(goalId: string, formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Not authenticated" };
  }

  const userId = await getDbUserId(user.id);
  if (!userId) {
    return { error: "User not found in database" };
  }

  return updateGoal(goalId, formData, userId);
}

export async function deleteGoalFromClient(goalId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Not authenticated" };
  }

  const userId = await getDbUserId(user.id);
  if (!userId) {
    return { error: "User not found in database" };
  }

  return deleteGoal(goalId, userId);
}

export async function getUserGoalsFromClient() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Not authenticated" };
  }

  const userId = await getDbUserId(user.id);
  if (!userId) {
    return { error: "User not found in database" };
  }

  return getUserGoals(userId);
}
