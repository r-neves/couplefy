"use server";

import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { getDbUserId } from "@/lib/utils/user";
import { getUserGroupIds } from "@/lib/utils/groups";

// Core functions that accept userId directly

export async function createCategory(formData: FormData, userId: string) {
  const name = formData.get("name") as string;
  const color = formData.get("color") as string;
  const icon = formData.get("icon") as string || null;
  const groupId = formData.get("groupId") as string || null;

  if (!name) {
    return { error: "Name is required" };
  }

  try {
    // Create category
    const category = await prisma.categories.create({
      data: {
        name: name.trim(),
        color: color || "#6366f1",
        icon,
        user_id: groupId ? null : userId, // null if group category
        group_id: groupId || null,
      },
    });

    revalidatePath("/dashboard");
    return { success: true, categoryId: category.id };
  } catch (error) {
    console.error("Error creating category:", error);
    return { error: "Failed to create category" };
  }
}

export async function getUserCategories(userId: string, groupId?: string, userGroupIds?: string[]) {
  try {
    // Get all groups the user is a member of (or use provided userGroupIds)
    const groupIds = userGroupIds ?? await getUserGroupIds(userId);

    let userCategories;

    if (groupId) {
      // Get group categories only
      userCategories = await prisma.categories.findMany({
        where: { group_id: groupId },
        orderBy: { name: "asc" },
      });
    } else {
      // Get personal categories and all shared categories from user's groups
      if (groupIds.length > 0) {
        userCategories = await prisma.categories.findMany({
          where: {
            OR: [
              // Personal categories (no groupId, created by user)
              { user_id: userId, group_id: null },
              // Shared categories (in any of user's groups)
              { group_id: { in: groupIds } },
            ],
          },
          orderBy: { name: "asc" },
        });
      } else {
        // User has no groups, only show personal categories
        userCategories = await prisma.categories.findMany({
          where: { user_id: userId, group_id: null },
          orderBy: { name: "asc" },
        });
      }
    }

    // Transform to match expected format
    const categories = userCategories.map((category) => ({
      id: category.id,
      userId: category.user_id,
      groupId: category.group_id,
      name: category.name,
      color: category.color,
      icon: category.icon,
      createdAt: category.created_at,
      updatedAt: category.updated_at,
    }));

    return { success: true, categories };
  } catch (error) {
    console.error("Error getting categories:", error);
    return { error: "Failed to get categories" };
  }
}

export async function updateCategory(categoryId: string, formData: FormData, userId: string) {
  const name = formData.get("name") as string;
  const color = formData.get("color") as string || "#6366f1";

  if (!name) {
    return { error: "Category name is required" };
  }

  try {
    // Verify ownership or group membership
    const category = await prisma.categories.findUnique({
      where: { id: categoryId },
    });

    if (!category) {
      return { error: "Category not found" };
    }

    // Check if user has permission to edit
    if (category.user_id && category.user_id !== userId) {
      return { error: "Unauthorized" };
    }

    if (category.group_id) {
      const membership = await prisma.group_members.findFirst({
        where: {
          group_id: category.group_id,
          user_id: userId,
        },
      });

      if (!membership) {
        return { error: "Unauthorized" };
      }
    }

    await prisma.categories.update({
      where: { id: categoryId },
      data: {
        name: name.trim(),
        color,
        updated_at: new Date(),
      },
    });

    revalidatePath("/dashboard");
    return { success: true };
  } catch (error) {
    console.error("Error updating category:", error);
    return { error: "Failed to update category" };
  }
}

export async function deleteCategory(categoryId: string, userId: string) {
  try {
    // Check if user owns this category
    const category = await prisma.categories.findUnique({
      where: { id: categoryId },
    });

    if (!category) {
      return { error: "Category not found" };
    }

    // Check if user has permission to delete
    if (category.user_id && category.user_id !== userId) {
      return { error: "You don't have permission to delete this category" };
    }

    if (category.group_id) {
      // For group categories, verify user is in the group
      const membership = await prisma.group_members.findFirst({
        where: {
          group_id: category.group_id,
          user_id: userId,
        },
      });

      if (!membership) {
        return { error: "You don't have permission to delete this category" };
      }
    }

    await prisma.categories.delete({
      where: { id: categoryId },
    });

    revalidatePath("/dashboard");
    return { success: true };
  } catch (error) {
    console.error("Error deleting category:", error);
    // Check if error is due to foreign key constraint
    if (error instanceof Error && error.message.includes("foreign key constraint")) {
      return { error: "Cannot delete category that is being used" };
    }
    return { error: "Failed to delete category" };
  }
}

// Client-facing wrapper functions that fetch userId automatically

export async function createCategoryFromClient(formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Not authenticated" };
  }

  const userId = await getDbUserId(user.id);
  if (!userId) {
    return { error: "User not found in database" };
  }

  return createCategory(formData, userId);
}

export async function getUserCategoriesFromClient(groupId?: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Not authenticated" };
  }

  const userId = await getDbUserId(user.id);
  if (!userId) {
    return { error: "User not found in database" };
  }

  return getUserCategories(userId, groupId);
}

export async function updateCategoryFromClient(categoryId: string, formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Not authenticated" };
  }

  const userId = await getDbUserId(user.id);
  if (!userId) {
    return { error: "User not found in database" };
  }

  return updateCategory(categoryId, formData, userId);
}

export async function deleteCategoryFromClient(categoryId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Not authenticated" };
  }

  const userId = await getDbUserId(user.id);
  if (!userId) {
    return { error: "User not found in database" };
  }

  return deleteCategory(categoryId, userId);
}
