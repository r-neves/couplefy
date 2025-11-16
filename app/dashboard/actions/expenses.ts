"use server";

import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { getDbUserId } from "@/lib/utils/user";
import { getUserGroupIds } from "@/lib/utils/groups";

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

    const expense = await prisma.expenses.create({
      data: {
        user_id: expenseUserId,
        group_id: groupId || null,
        category_id: categoryId,
        amount,
        description,
        date: new Date(date),
      },
    });

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
    const expense = await prisma.expenses.findUnique({
      where: { id: expenseId },
    });

    if (!expense || expense.user_id !== userId) {
      return { error: "Expense not found or unauthorized" };
    }

    await prisma.expenses.update({
      where: { id: expenseId },
      data: {
        amount,
        category_id: categoryId,
        description,
        date: new Date(date),
        updated_at: new Date(),
      },
    });

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
    const expense = await prisma.expenses.findUnique({
      where: { id: expenseId },
    });

    if (!expense || expense.user_id !== userId) {
      return { error: "Expense not found or unauthorized" };
    }

    await prisma.expenses.delete({
      where: { id: expenseId },
    });

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
      // Get personal expenses OR shared expenses from user's groups
      if (userGroupIds.length > 0) {
        whereCondition.OR = [
          // Personal expenses (no groupId, created by user)
          { user_id: userId, group_id: null },
          // Shared expenses (in any of user's groups)
          { group_id: { in: userGroupIds } },
        ];
      } else {
        // User has no groups, only show personal expenses
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

    const userExpenses = await prisma.expenses.findMany({
      where: whereCondition,
      include: {
        categories: true,
        groups: true,
        users: true,
      },
      orderBy: { date: "desc" },
    });

    // Transform to match expected format
    const expenses = userExpenses.map((expense) => ({
      id: expense.id,
      userId: expense.user_id,
      groupId: expense.group_id,
      categoryId: expense.category_id,
      amount: expense.amount.toString(),
      description: expense.description,
      date: expense.date,
      createdAt: expense.created_at,
      updatedAt: expense.updated_at,
      category: {
        id: expense.categories.id,
        userId: expense.categories.user_id,
        groupId: expense.categories.group_id,
        name: expense.categories.name,
        color: expense.categories.color,
        icon: expense.categories.icon,
        createdAt: expense.categories.created_at,
        updatedAt: expense.categories.updated_at,
      },
      group: expense.groups
        ? {
            id: expense.groups.id,
            name: expense.groups.name,
            createdBy: expense.groups.created_by,
            createdAt: expense.groups.created_at,
            updatedAt: expense.groups.updated_at,
          }
        : null,
      user: {
        id: expense.users.id,
        email: expense.users.email,
        name: expense.users.name,
        avatarUrl: expense.users.avatar_url,
        supabaseId: expense.users.supabase_id,
        createdAt: expense.users.created_at,
        updatedAt: expense.users.updated_at,
      },
    }));

    return { success: true, expenses };
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
