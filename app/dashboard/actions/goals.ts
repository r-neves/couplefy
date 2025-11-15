"use server";

import { createClient } from "@/lib/supabase/server";
import { db } from "@/lib/db";
import { goals, groupMembers } from "@/lib/db/schema";
import { eq, and, or, inArray } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { getDbUserId } from "@/lib/utils/user";

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
      const membership = await db.query.groupMembers.findFirst({
        where: and(
          eq(groupMembers.groupId, groupId),
          eq(groupMembers.userId, userId)
        ),
      });

      if (!membership) {
        return { error: "You are not a member of this group" };
      }
    }

    const [goal] = await db.insert(goals).values({
      userId: groupId ? null : userId, // Group goals don't have a userId
      groupId: groupId || null,
      name,
      targetAmount,
      color,
      icon,
      description,
    }).returning();

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
    const goal = await db.query.goals.findFirst({
      where: eq(goals.id, goalId),
    });

    if (!goal) {
      return { error: "Goal not found" };
    }

    // Check if user has permission to edit
    if (goal.userId && goal.userId !== userId) {
      return { error: "Unauthorized" };
    }

    if (goal.groupId) {
      const membership = await db.query.groupMembers.findFirst({
        where: and(
          eq(groupMembers.groupId, goal.groupId),
          eq(groupMembers.userId, userId)
        ),
      });

      if (!membership) {
        return { error: "Unauthorized" };
      }
    }

    await db.update(goals)
      .set({
        name,
        targetAmount,
        color,
        icon,
        description,
        updatedAt: new Date(),
      })
      .where(eq(goals.id, goalId));

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
    const goal = await db.query.goals.findFirst({
      where: eq(goals.id, goalId),
    });

    if (!goal) {
      return { error: "Goal not found" };
    }

    // Check if user has permission to delete
    if (goal.userId && goal.userId !== userId) {
      return { error: "Unauthorized" };
    }

    if (goal.groupId) {
      const membership = await db.query.groupMembers.findFirst({
        where: and(
          eq(groupMembers.groupId, goal.groupId),
          eq(groupMembers.userId, userId)
        ),
      });

      if (!membership) {
        return { error: "Unauthorized" };
      }
    }

    await db.delete(goals).where(eq(goals.id, goalId));

    revalidatePath("/dashboard");
    return { success: true };
  } catch (error) {
    console.error("Error deleting goal:", error);
    return { error: "Failed to delete goal" };
  }
}

export async function getUserGoals(userId: string) {
  try {
    // Get all groups the user is a member of
    const userGroupMemberships = await db.query.groupMembers.findMany({
      where: eq(groupMembers.userId, userId),
    });

    const userGroupIds = userGroupMemberships.map(gm => gm.groupId);

    // Get personal goals and goals from user's groups
    let condition;
    if (userGroupIds.length > 0) {
      condition = or(
        eq(goals.userId, userId),
        inArray(goals.groupId, userGroupIds)
      );
    } else {
      condition = eq(goals.userId, userId);
    }

    const userGoals = await db.query.goals.findMany({
      where: condition,
      with: {
        group: true,
      },
      orderBy: (goals, { desc }) => [desc(goals.createdAt)],
    });

    return { success: true, goals: userGoals };
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
