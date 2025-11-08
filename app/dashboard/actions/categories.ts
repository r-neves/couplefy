"use server";

import { createClient } from "@/lib/supabase/server";
import { db } from "@/lib/db";
import { categories, users, groupMembers } from "@/lib/db/schema";
import { eq, and, or, isNull, inArray } from "drizzle-orm";
import { revalidatePath } from "next/cache";

export async function createCategory(formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Not authenticated" };
  }

  const name = formData.get("name") as string;
  const color = formData.get("color") as string;
  const icon = formData.get("icon") as string || null;
  const groupId = formData.get("groupId") as string || null;

  if (!name) {
    return { error: "Name is required" };
  }

  try {
    const dbUser = await db.query.users.findFirst({
      where: eq(users.supabaseId, user.id),
    });

    if (!dbUser) {
      return { error: "User not found" };
    }

    // Create category
    const [category] = await db.insert(categories).values({
      name: name.trim(),
      color: color || "#6366f1",
      icon,
      userId: groupId ? null : dbUser.id, // null if group category
      groupId: groupId || null,
    }).returning();

    revalidatePath("/dashboard");
    return { success: true, categoryId: category.id };
  } catch (error) {
    console.error("Error creating category:", error);
    return { error: "Failed to create category" };
  }
}

export async function getUserCategories(groupId?: string) {
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

    let whereCondition;

    if (groupId) {
      // Get group categories only
      whereCondition = eq(categories.groupId, groupId);
    } else {
      // Get personal categories and all shared categories from user's groups
      if (userGroupIds.length > 0) {
        whereCondition = or(
          // Personal categories (no groupId, created by user)
          and(eq(categories.userId, dbUser.id), isNull(categories.groupId)),
          // Shared categories (in any of user's groups)
          inArray(categories.groupId, userGroupIds)
        );
      } else {
        // User has no groups, only show personal categories
        whereCondition = and(eq(categories.userId, dbUser.id), isNull(categories.groupId));
      }
    }

    const userCategories = await db.query.categories.findMany({
      where: whereCondition,
      orderBy: (categories, { asc }) => [asc(categories.name)],
    });

    return { success: true, categories: userCategories };
  } catch (error) {
    console.error("Error getting categories:", error);
    return { error: "Failed to get categories" };
  }
}

export async function updateCategory(categoryId: string, formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Not authenticated" };
  }

  const name = formData.get("name") as string;
  const color = formData.get("color") as string || "#6366f1";

  if (!name) {
    return { error: "Category name is required" };
  }

  try {
    const dbUser = await db.query.users.findFirst({
      where: eq(users.supabaseId, user.id),
    });

    if (!dbUser) {
      return { error: "User not found" };
    }

    // Verify ownership or group membership
    const category = await db.query.categories.findFirst({
      where: eq(categories.id, categoryId),
    });

    if (!category) {
      return { error: "Category not found" };
    }

    // Check if user has permission to edit
    if (category.userId && category.userId !== dbUser.id) {
      return { error: "Unauthorized" };
    }

    if (category.groupId) {
      const membership = await db.query.groupMembers.findFirst({
        where: and(
          eq(groupMembers.groupId, category.groupId),
          eq(groupMembers.userId, dbUser.id)
        ),
      });

      if (!membership) {
        return { error: "Unauthorized" };
      }
    }

    await db.update(categories)
      .set({
        name: name.trim(),
        color,
        updatedAt: new Date(),
      })
      .where(eq(categories.id, categoryId));

    revalidatePath("/dashboard");
    return { success: true };
  } catch (error) {
    console.error("Error updating category:", error);
    return { error: "Failed to update category" };
  }
}

export async function deleteCategory(categoryId: string) {
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

    // Check if user owns this category
    const category = await db.query.categories.findFirst({
      where: eq(categories.id, categoryId),
    });

    if (!category) {
      return { error: "Category not found" };
    }

    // Check if user has permission to delete
    if (category.userId && category.userId !== dbUser.id) {
      return { error: "You don't have permission to delete this category" };
    }

    if (category.groupId) {
      // For group categories, verify user is in the group
      const membership = await db.query.groupMembers.findFirst({
        where: and(
          eq(groupMembers.groupId, category.groupId),
          eq(groupMembers.userId, dbUser.id)
        ),
      });

      if (!membership) {
        return { error: "You don't have permission to delete this category" };
      }
    }

    await db.delete(categories).where(eq(categories.id, categoryId));

    revalidatePath("/dashboard");
    return { success: true };
  } catch (error) {
    console.error("Error deleting category:", error);
    // Check if error is due to foreign key constraint
    if (error instanceof Error && error.message.includes("restrict")) {
      return { error: "Cannot delete category that is being used" };
    }
    return { error: "Failed to delete category" };
  }
}
