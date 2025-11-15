"use server";

import { createClient } from "@/lib/supabase/server";
import { db } from "@/lib/db";
import { savings, groupMembers } from "@/lib/db/schema";
import { eq, and, gte, lte, desc, or, isNull, inArray } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { getDbUserId } from "@/lib/utils/user";

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

    const [saving] = await db.insert(savings).values({
      userId: savingUserId,
      groupId: groupId || null,
      goalId,
      amount,
      description,
      date: new Date(date),
    }).returning();

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
    const saving = await db.query.savings.findFirst({
      where: eq(savings.id, savingId),
    });

    if (!saving || saving.userId !== userId) {
      return { error: "Saving not found or unauthorized" };
    }

    await db.update(savings)
      .set({
        amount,
        goalId,
        description,
        date: new Date(date),
        updatedAt: new Date(),
      })
      .where(eq(savings.id, savingId));

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
    const saving = await db.query.savings.findFirst({
      where: eq(savings.id, savingId),
    });

    if (!saving || saving.userId !== userId) {
      return { error: "Saving not found or unauthorized" };
    }

    await db.delete(savings).where(eq(savings.id, savingId));

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
}) {
  try {
    // Get all groups the user is a member of
    const userGroupMemberships = await db.query.groupMembers.findMany({
      where: eq(groupMembers.userId, userId),
    });

    const userGroupIds = userGroupMemberships.map(gm => gm.groupId);

    // Build base condition: personal savings OR shared savings from user's groups
    let baseCondition;
    if (userGroupIds.length > 0) {
      baseCondition = or(
        // Personal savings (no groupId, created by user)
        and(
          eq(savings.userId, userId),
          isNull(savings.groupId)
        ),
        // Shared savings (in any of user's groups)
        inArray(savings.groupId, userGroupIds)
      );
    } else {
      // User has no groups, only show personal savings
      baseCondition = and(
        eq(savings.userId, userId),
        isNull(savings.groupId)
      );
    }

    // Add additional filters
    let additionalConditions = [];

    if (params?.groupId) {
      additionalConditions.push(eq(savings.groupId, params.groupId));
    }

    if (params?.startDate) {
      additionalConditions.push(gte(savings.date, params.startDate));
    }

    if (params?.endDate) {
      additionalConditions.push(lte(savings.date, params.endDate));
    }

    const finalCondition = additionalConditions.length > 0
      ? and(baseCondition, ...additionalConditions)
      : baseCondition;

    const userSavings = await db.query.savings.findMany({
      where: finalCondition,
      with: {
        goal: true,
        group: true,
        user: true,
      },
      orderBy: [desc(savings.date)],
    });

    return { success: true, savings: userSavings };
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
