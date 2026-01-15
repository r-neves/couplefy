"use server";

import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { getDbUserId } from "@/lib/utils/user";
import { getUserGroupIds } from "@/lib/utils/groups";

// Core functions usually accept userId directly so they can be reused internally

export async function createShoppingCategory(formData: FormData, userId: string) {
  const name = formData.get("name") as string;
  const color = formData.get("color") as string;
  const icon = formData.get("icon") as string || null;
  const groupId = formData.get("groupId") as string || null;

  if (!name) {
    return { error: "Name is required" };
  }

  try {
    const category = await prisma.shopping_categories.create({
      data: {
        name: name.trim(),
        color: color || "#6366f1",
        icon,
        user_id: groupId ? null : userId,
        group_id: groupId || null,
      },
    });

    revalidatePath("/dashboard/shopping-list");
    return { success: true, categoryId: category.id };
  } catch (error) {
    console.error("Error creating shopping category:", error);
    return { error: "Failed to create shopping category" };
  }
}

export async function getShoppingCategories(userId: string, groupId?: string) {
  try {
    const groupIds = await getUserGroupIds(userId);

    let items;

    if (groupId) {
      items = await prisma.shopping_categories.findMany({
        where: { group_id: groupId },
        orderBy: { display_order: "asc" },
      });
    } else {
      items = await prisma.shopping_categories.findMany({
        where: {
          OR: [
            { user_id: userId, group_id: null },
            { group_id: { in: groupIds } },
          ],
        },
        orderBy: { display_order: "asc" },
      });
    }

    const categories = items.map((cat) => ({
      id: cat.id,
      userId: cat.user_id,
      groupId: cat.group_id,
      name: cat.name,
      color: cat.color,
      icon: cat.icon,
      displayOrder: cat.display_order,
    }));

    return { success: true, categories };
  } catch (error) {
    console.error("Error getting shopping categories:", error);
    return { error: "Failed to get shopping categories" };
  }
}

export async function updateShoppingCategory(categoryId: string, formData: FormData, userId: string) {
  const name = formData.get("name") as string;
  const color = formData.get("color") as string;
  const icon = formData.get("icon") as string | null;

  if (!name) {
    return { error: "Name is required" };
  }

  try {
    const category = await prisma.shopping_categories.findUnique({
      where: { id: categoryId },
    });

    if (!category) {
      return { error: "Category not found" };
    }

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

    await prisma.shopping_categories.update({
      where: { id: categoryId },
      data: {
        name: name.trim(),
        color: color || "#6366f1",
        icon: icon || null,
      },
    });

    revalidatePath("/dashboard/shopping-list");
    return { success: true };
  } catch (error) {
    console.error("Error updating shopping category:", error);
    return { error: "Failed to update shopping category" };
  }
}

export async function deleteShoppingCategory(categoryId: string, userId: string) {
  try {
    const category = await prisma.shopping_categories.findUnique({
      where: { id: categoryId },
    });

    if (!category) {
      return { error: "Category not found" };
    }

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

    await prisma.shopping_categories.delete({
      where: { id: categoryId },
    });

    revalidatePath("/dashboard/shopping-list");
    return { success: true };
  } catch (error) {
    console.error("Error deleting shopping category:", error);
    return { error: "Failed to delete shopping category" };
  }
}

export async function updateCategoryOrder(categoryIds: string[], userId: string) {
  try {
    // Get user's group IDs first
    const groupIds = await getUserGroupIds(userId);
    
    // Update each category with its new display_order
    const updates = categoryIds.map((categoryId, index) =>
      prisma.shopping_categories.updateMany({
        where: {
          id: categoryId,
          OR: [
            { user_id: userId },
            { group_id: { in: groupIds } }
          ]
        },
        data: { display_order: index }
      })
    );

    await Promise.all(updates);

    revalidatePath("/dashboard/shopping-list");
    return { success: true };
  } catch (error) {
    console.error("Error updating category order:", error);
    return { error: "Failed to update category order" };
  }
}

// Client wrappers

export async function createShoppingCategoryFromClient(formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return { error: "Not authenticated" };
  const userId = await getDbUserId(user.id);
  if (!userId) return { error: "User not found" };

  return createShoppingCategory(formData, userId);
}

export async function getShoppingCategoriesFromClient(groupId?: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return { error: "Not authenticated" };
  const userId = await getDbUserId(user.id);
  if (!userId) return { error: "User not found" };

  return getShoppingCategories(userId, groupId);
}

export async function updateShoppingCategoryFromClient(categoryId: string, formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return { error: "Not authenticated" };
  const userId = await getDbUserId(user.id);
  if (!userId) return { error: "User not found" };

  return updateShoppingCategory(categoryId, formData, userId);
}

export async function deleteShoppingCategoryFromClient(categoryId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return { error: "Not authenticated" };
  const userId = await getDbUserId(user.id);
  if (!userId) return { error: "User not found" };

  return deleteShoppingCategory(categoryId, userId);
}

export async function updateCategoryOrderFromClient(categoryIds: string[]) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return { error: "Not authenticated" };
  const userId = await getDbUserId(user.id);
  if (!userId) return { error: "User not found" };

  return updateCategoryOrder(categoryIds, userId);
}
