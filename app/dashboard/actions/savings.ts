"use server";

import { createClient } from "@/lib/supabase/server";
import { db } from "@/lib/db";
import { savings, users, groupMembers } from "@/lib/db/schema";
import { eq, and, gte, lte, desc, or, isNull, inArray } from "drizzle-orm";
import { revalidatePath } from "next/cache";

export async function createSaving(formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Not authenticated" };
  }

  const amount = formData.get("amount") as string;
  const categoryId = formData.get("categoryId") as string;
  const description = formData.get("description") as string || null;
  const date = formData.get("date") as string;
  const groupId = formData.get("groupId") as string || null;

  if (!amount || !categoryId || !date) {
    return { error: "Amount, category, and date are required" };
  }

  try {
    const dbUser = await db.query.users.findFirst({
      where: eq(users.supabaseId, user.id),
    });

    if (!dbUser) {
      return { error: "User not found" };
    }

    const [saving] = await db.insert(savings).values({
      userId: dbUser.id,
      groupId: groupId || null,
      categoryId,
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

export async function updateSaving(savingId: string, formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Not authenticated" };
  }

  const amount = formData.get("amount") as string;
  const categoryId = formData.get("categoryId") as string;
  const description = formData.get("description") as string || null;
  const date = formData.get("date") as string;

  if (!amount || !categoryId || !date) {
    return { error: "Amount, category, and date are required" };
  }

  try {
    const dbUser = await db.query.users.findFirst({
      where: eq(users.supabaseId, user.id),
    });

    if (!dbUser) {
      return { error: "User not found" };
    }

    // Verify ownership
    const saving = await db.query.savings.findFirst({
      where: eq(savings.id, savingId),
    });

    if (!saving || saving.userId !== dbUser.id) {
      return { error: "Saving not found or unauthorized" };
    }

    await db.update(savings)
      .set({
        amount,
        categoryId,
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

export async function deleteSaving(savingId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Not authenticated" };
  }

  try {
    const dbUser = await db.query.users.findFirst({
      where: eq(users.supabaseId, user.id),
    });

    if (!dbUser) {
      return { error: "User not found" };
    }

    // Verify ownership
    const saving = await db.query.savings.findFirst({
      where: eq(savings.id, savingId),
    });

    if (!saving || saving.userId !== dbUser.id) {
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

export async function getSavings(params?: {
  groupId?: string;
  startDate?: Date;
  endDate?: Date;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Not authenticated" };
  }

  try {
    const dbUser = await db.query.users.findFirst({
      where: eq(users.supabaseId, user.id),
    });

    if (!dbUser) {
      return { error: "User not found" };
    }

    // Get all groups the user is a member of
    const userGroupMemberships = await db.query.groupMembers.findMany({
      where: eq(groupMembers.userId, dbUser.id),
    });

    const userGroupIds = userGroupMemberships.map(gm => gm.groupId);

    // Build base condition: personal savings OR shared savings from user's groups
    let baseCondition;
    if (userGroupIds.length > 0) {
      baseCondition = or(
        // Personal savings (no groupId, created by user)
        and(
          eq(savings.userId, dbUser.id),
          isNull(savings.groupId)
        ),
        // Shared savings (in any of user's groups)
        inArray(savings.groupId, userGroupIds)
      );
    } else {
      // User has no groups, only show personal savings
      baseCondition = and(
        eq(savings.userId, dbUser.id),
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
        category: true,
        group: true,
      },
      orderBy: [desc(savings.date)],
    });

    return { success: true, savings: userSavings };
  } catch (error) {
    console.error("Error getting savings:", error);
    return { error: "Failed to get savings" };
  }
}
