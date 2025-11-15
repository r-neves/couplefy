"use server";

import { createClient } from "@/lib/supabase/server";
import { db } from "@/lib/db";
import { expenses, groupMembers } from "@/lib/db/schema";
import { eq, and, gte, lte, desc, or, isNull, inArray } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { getDbUserId } from "@/lib/utils/user";

// Core functions that accept userId directly

export async function createExpense(formData: FormData, userId: string) {
  const amount = formData.get("amount") as string;
  const categoryId = formData.get("categoryId") as string;
  const description = formData.get("description") as string || null;
  const date = formData.get("date") as string;
  const groupId = formData.get("groupId") as string || null;
  const paidById = formData.get("paidById") as string || null;

  if (!amount || !categoryId || !date) {
    return { error: "Amount, category, and date are required" };
  }

  try {
    // For group expenses, use paidById if provided, otherwise use current user
    // For personal expenses, always use current user
    const expenseUserId = groupId && paidById ? paidById : userId;

    const [expense] = await db.insert(expenses).values({
      userId: expenseUserId,
      groupId: groupId || null,
      categoryId,
      amount,
      description,
      date: new Date(date),
    }).returning();

    revalidatePath("/dashboard");
    return { success: true, expenseId: expense.id };
  } catch (error) {
    console.error("Error creating expense:", error);
    return { error: "Failed to create expense" };
  }
}

export async function updateExpense(expenseId: string, formData: FormData, userId: string) {
  const amount = formData.get("amount") as string;
  const categoryId = formData.get("categoryId") as string;
  const description = formData.get("description") as string || null;
  const date = formData.get("date") as string;

  if (!amount || !categoryId || !date) {
    return { error: "Amount, category, and date are required" };
  }

  try {
    // Verify ownership
    const expense = await db.query.expenses.findFirst({
      where: eq(expenses.id, expenseId),
    });

    if (!expense || expense.userId !== userId) {
      return { error: "Expense not found or unauthorized" };
    }

    await db.update(expenses)
      .set({
        amount,
        categoryId,
        description,
        date: new Date(date),
        updatedAt: new Date(),
      })
      .where(eq(expenses.id, expenseId));

    revalidatePath("/dashboard");
    return { success: true };
  } catch (error) {
    console.error("Error updating expense:", error);
    return { error: "Failed to update expense" };
  }
}

export async function deleteExpense(expenseId: string, userId: string) {
  try {
    // Verify ownership
    const expense = await db.query.expenses.findFirst({
      where: eq(expenses.id, expenseId),
    });

    if (!expense || expense.userId !== userId) {
      return { error: "Expense not found or unauthorized" };
    }

    await db.delete(expenses).where(eq(expenses.id, expenseId));

    revalidatePath("/dashboard");
    return { success: true };
  } catch (error) {
    console.error("Error deleting expense:", error);
    return { error: "Failed to delete expense" };
  }
}

export async function getExpenses(userId: string, params?: {
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

    // Build base condition: personal expenses OR shared expenses from user's groups
    let baseCondition;
    if (userGroupIds.length > 0) {
      baseCondition = or(
        // Personal expenses (no groupId, created by user)
        and(
          eq(expenses.userId, userId),
          isNull(expenses.groupId)
        ),
        // Shared expenses (in any of user's groups)
        inArray(expenses.groupId, userGroupIds)
      );
    } else {
      // User has no groups, only show personal expenses
      baseCondition = and(
        eq(expenses.userId, userId),
        isNull(expenses.groupId)
      );
    }

    // Add additional filters
    let additionalConditions = [];

    if (params?.groupId) {
      additionalConditions.push(eq(expenses.groupId, params.groupId));
    }

    if (params?.startDate) {
      additionalConditions.push(gte(expenses.date, params.startDate));
    }

    if (params?.endDate) {
      additionalConditions.push(lte(expenses.date, params.endDate));
    }

    const finalCondition = additionalConditions.length > 0
      ? and(baseCondition, ...additionalConditions)
      : baseCondition;

    const userExpenses = await db.query.expenses.findMany({
      where: finalCondition,
      with: {
        category: true,
        group: true,
        user: true,
      },
      orderBy: [desc(expenses.date)],
    });

    return { success: true, expenses: userExpenses };
  } catch (error) {
    console.error("Error getting expenses:", error);
    return { error: "Failed to get expenses" };
  }
}

// Client-facing wrapper functions that fetch userId automatically

export async function createExpenseFromClient(formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Not authenticated" };
  }

  const userId = await getDbUserId(user.id);
  if (!userId) {
    return { error: "User not found in database" };
  }

  return createExpense(formData, userId);
}

export async function updateExpenseFromClient(expenseId: string, formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Not authenticated" };
  }

  const userId = await getDbUserId(user.id);
  if (!userId) {
    return { error: "User not found in database" };
  }

  return updateExpense(expenseId, formData, userId);
}

export async function deleteExpenseFromClient(expenseId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Not authenticated" };
  }

  const userId = await getDbUserId(user.id);
  if (!userId) {
    return { error: "User not found in database" };
  }

  return deleteExpense(expenseId, userId);
}

export async function getExpensesFromClient(params?: {
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

  return getExpenses(userId, params);
}
