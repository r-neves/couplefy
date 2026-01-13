"use server";

import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { getDbUserId } from "@/lib/utils/user";
import { getUserGroupIds } from "@/lib/utils/groups";
import { Prisma } from "@prisma/client";

// --- Shopping List Items ---

export async function createShoppingListItem(formData: FormData, userId: string) {
  const name = formData.get("name") as string;
  const quantity = parseFloat(formData.get("quantity") as string) || 1;
  const unit = formData.get("unit") as string || null;
  const categoryId = formData.get("categoryId") as string;
  const groupId = formData.get("groupId") as string || null;

  if (!name || !categoryId) {
    return { error: "Name and Category are required" };
  }

  try {
    const item = await prisma.shopping_list_items.create({
      data: {
        name: name.trim(),
        quantity,
        unit,
        category_id: categoryId,
        user_id: groupId ? null : userId,
        group_id: groupId || null,
        completed: false,
      },
    });

    revalidatePath("/dashboard/shopping-list");
    return { success: true, itemId: item.id };
  } catch (error) {
    console.error("Error creating shopping list item:", error);
    return { error: "Failed to create item" };
  }
}

export async function getShoppingListItems(userId: string, groupId?: string) {
  try {
    const where = groupId
      ? { group_id: groupId }
      : { user_id: userId, group_id: null };

    const items = await prisma.shopping_list_items.findMany({
      where,
      include: {
        shopping_categories: true,
      },
      orderBy: { created_at: "desc" },
    });

    return { success: true, items };
  } catch (error) {
    console.error("Error fetching shopping list items:", error);
    return { error: "Failed to fetch items" };
  }
}

export async function updateShoppingListItem(itemId: string, data: { completed?: boolean; quantity?: number; unit?: string }, userId: string) {
  try {
    // Verify ownership/membership logic could be added here similar to categories
    // For brevity, assuming user has access if they can see the item (less critical than delete)
    // But good practice to verify.

    const item = await prisma.shopping_list_items.findUnique({ where: { id: itemId } });
    if (!item) return { error: "Item not found" };

    // Check permissions
    if (item.group_id) {
       const membership = await prisma.group_members.findFirst({
        where: { group_id: item.group_id, user_id: userId }
      });
      if (!membership) return { error: "Unauthorized" };
    } else if (item.user_id !== userId) {
      return { error: "Unauthorized" };
    }

    await prisma.shopping_list_items.update({
      where: { id: itemId },
      data,
    });

    revalidatePath("/dashboard/shopping-list");
    return { success: true };
  } catch (error) {
    console.error("Error updating shopping list item:", error);
    return { error: "Failed to update item" };
  }
}

export async function deleteShoppingListItem(itemId: string, userId: string) {
  try {
    const item = await prisma.shopping_list_items.findUnique({ where: { id: itemId } });
    if (!item) return { error: "Item not found" };

     if (item.group_id) {
       const membership = await prisma.group_members.findFirst({
        where: { group_id: item.group_id, user_id: userId }
      });
      if (!membership) return { error: "Unauthorized" };
    } else if (item.user_id !== userId) {
      return { error: "Unauthorized" };
    }

    await prisma.shopping_list_items.delete({ where: { id: itemId } });
    revalidatePath("/dashboard/shopping-list");
    return { success: true };
  } catch (error) {
    console.error("Error deleting shopping item:", error);
    return { error: "Failed to delete item" };
  }
}

export async function clearShoppingList(userId: string, groupId?: string) {
  try {
    // Verify permissions for group
    if (groupId) {
      const membership = await prisma.group_members.findFirst({
        where: { group_id: groupId, user_id: userId }
      });
      if (!membership) return { error: "Unauthorized" };
    }

    const where = groupId
      ? { group_id: groupId }
      : { user_id: userId, group_id: null };

    await prisma.shopping_list_items.deleteMany({ where });
    revalidatePath("/dashboard/shopping-list");
    return { success: true };
  } catch (error) {
    console.error("Error clearing shopping list:", error);
    return { error: "Failed to clear shopping list" };
  }
}

// --- Saved Items ---

export async function getSavedItems(userId: string, groupId?: string) {
  try {
    const groupIds = await getUserGroupIds(userId);
    
    // Fetch personal saved items + shared group saved items
    // Or just fetch all accessible saved items?
    // Plan says "Saved items for autocomplete".
    
    // We can fetch items created by user or available in their groups.
    const items = await prisma.saved_items.findMany({
      where: {
         OR: [
            { user_id: userId, group_id: null },
            { group_id: { in: groupIds } },
          ],
      },
      include: {
        shopping_categories: true
      }
    });

    return { success: true, items };
  } catch (error) {
    console.error("Error fetching saved items:", error);
    return { error: "Failed to fetch saved items" };
  }
}

export async function createSavedItem(data: {names: Record<string, string>, categoryId: string, groupId?: string}, userId: string) {
  try {
    await prisma.saved_items.create({
      data: {
        names: data.names as unknown as any,
        category_id: data.categoryId,
        user_id: data.groupId ? null : userId,
        group_id: data.groupId || null,
      }
    });

    revalidatePath("/dashboard/shopping-list");
    return { success: true };
  } catch (error) {
    console.error("Error creating saved item:", error);
    return { error: "Failed to create saved item" };
  }
}

export async function updateSavedItem(itemId: string, data: {names: Record<string, string>, categoryId: string}, userId: string) {
  try {
    const item = await prisma.saved_items.findUnique({
      where: { id: itemId },
    });

    if (!item) {
      return { error: "Item not found" };
    }

    if (item.user_id && item.user_id !== userId) {
      return { error: "Unauthorized" };
    }

    if (item.group_id) {
      const membership = await prisma.group_members.findFirst({
        where: {
          group_id: item.group_id,
          user_id: userId,
        },
      });

      if (!membership) {
        return { error: "Unauthorized" };
      }
    }

    await prisma.saved_items.update({
      where: { id: itemId },
      data: {
        names: data.names as unknown as any,
        category_id: data.categoryId,
      },
    });

    revalidatePath("/dashboard/shopping-list");
    return { success: true };
  } catch (error) {
    console.error("Error updating saved item:", error);
    return { error: "Failed to update saved item" };
  }
}

export async function deleteSavedItem(itemId: string, userId: string) {
  try {
    const item = await prisma.saved_items.findUnique({
      where: { id: itemId },
    });

    if (!item) {
      return { error: "Item not found" };
    }

    if (item.user_id && item.user_id !== userId) {
      return { error: "Unauthorized" };
    }

    if (item.group_id) {
      const membership = await prisma.group_members.findFirst({
        where: {
          group_id: item.group_id,
          user_id: userId,
        },
      });

      if (!membership) {
        return { error: "Unauthorized" };
      }
    }

    await prisma.saved_items.delete({
      where: { id: itemId },
    });

    revalidatePath("/dashboard/shopping-list");
    return { success: true };
  } catch (error) {
    console.error("Error deleting saved item:", error);
    return { error: "Failed to delete saved item" };
  }
}

// --- Client Wrappers ---

export async function createShoppingListItemFromClient(formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };
  const userId = await getDbUserId(user.id);
  if (!userId) return { error: "User not found" };

  return createShoppingListItem(formData, userId);
}

export async function getShoppingListItemsFromClient(groupId?: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };
  const userId = await getDbUserId(user.id);
  if (!userId) return { error: "User not found" };

  return getShoppingListItems(userId, groupId);
}

export async function toggleShoppingItemFromClient(itemId: string, completed: boolean) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };
  const userId = await getDbUserId(user.id);
  if (!userId) return { error: "User not found" };

  return updateShoppingListItem(itemId, { completed }, userId);
}

export async function deleteShoppingItemFromClient(itemId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };
  const userId = await getDbUserId(user.id);
  if (!userId) return { error: "User not found" };

  return deleteShoppingListItem(itemId, userId);
}

export async function clearShoppingListFromClient(groupId?: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };
  const userId = await getDbUserId(user.id);
  if (!userId) return { error: "User not found" };

  return clearShoppingList(userId, groupId);
}

export async function getSavedItemsFromClient(groupId?: string) {
   const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };
  const userId = await getDbUserId(user.id);
  if (!userId) return { error: "User not found" };
  
  return getSavedItems(userId, groupId);
}

export async function createSavedItemFromClient(names: Record<string, string>, categoryId: string, groupId?: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };
  const userId = await getDbUserId(user.id);
  if (!userId) return { error: "User not found" };

  return createSavedItem({ names, categoryId, groupId }, userId);
}

export async function updateSavedItemFromClient(itemId: string, names: Record<string, string>, categoryId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };
  const userId = await getDbUserId(user.id);
  if (!userId) return { error: "User not found" };

  return updateSavedItem(itemId, { names, categoryId }, userId);
}

export async function deleteSavedItemFromClient(itemId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };
  const userId = await getDbUserId(user.id);
  if (!userId) return { error: "User not found" };

  return deleteSavedItem(itemId, userId);
}
