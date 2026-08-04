"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { getAuthenticatedUserId } from "@/lib/utils/user";
import { getUserGroupIds } from "@/lib/utils/groups";
import {
  assertScopeAccess,
  assertRowAccess,
  scopeWhere,
  scopeOwnership,
} from "@/lib/utils/scope";

const MEAL_PLANNING_PATH = "/dashboard/meal-planning";
const DEFAULT_COLOR = "#6366f1";

export interface RecipeCategoryDTO {
  id: string;
  userId: string | null;
  groupId: string | null;
  name: string;
  color: string | null;
  icon: string | null;
  displayOrder: number;
}

/** The columns the user described from their Notion board. */
const STARTER_CATEGORIES = [
  { name: "Meat", color: "#ef4444", icon: "🥩" },
  { name: "Fish", color: "#3b82f6", icon: "🐟" },
  { name: "Veg", color: "#22c55e", icon: "🥦" },
  { name: "Soups", color: "#f59e0b", icon: "🍲" },
];

export async function createRecipeCategory(formData: FormData, userId: string) {
  const name = formData.get("name") as string;
  const color = formData.get("color") as string;
  const icon = (formData.get("icon") as string) || null;
  const groupId = (formData.get("groupId") as string) || null;

  if (!name?.trim()) {
    return { error: "Name is required" };
  }

  const access = await assertScopeAccess(userId, groupId);
  if ("error" in access) return access;

  try {
    // Append to the end of the board rather than landing on 0 alongside others.
    const last = await prisma.recipe_categories.findFirst({
      where: scopeWhere(userId, groupId),
      orderBy: { display_order: "desc" },
      select: { display_order: true },
    });

    const category = await prisma.recipe_categories.create({
      data: {
        name: name.trim(),
        color: color || DEFAULT_COLOR,
        icon,
        display_order: (last?.display_order ?? -1) + 1,
        ...scopeOwnership(userId, groupId),
      },
    });

    revalidatePath(MEAL_PLANNING_PATH);
    return { success: true as const, categoryId: category.id };
  } catch (error) {
    console.error("Error creating recipe category:", error);
    return { error: "Failed to create recipe category" };
  }
}

export async function getRecipeCategories(userId: string, groupId?: string) {
  try {
    if (groupId) {
      const access = await assertScopeAccess(userId, groupId);
      if ("error" in access) return access;
    }

    const items = await prisma.recipe_categories.findMany({
      where: scopeWhere(userId, groupId),
      orderBy: { display_order: "asc" },
    });

    const categories: RecipeCategoryDTO[] = items.map((cat) => ({
      id: cat.id,
      userId: cat.user_id,
      groupId: cat.group_id,
      name: cat.name,
      color: cat.color,
      icon: cat.icon,
      displayOrder: cat.display_order,
    }));

    return { success: true as const, categories };
  } catch (error) {
    console.error("Error getting recipe categories:", error);
    return { error: "Failed to get recipe categories" };
  }
}

export async function updateRecipeCategory(
  categoryId: string,
  formData: FormData,
  userId: string
) {
  const name = formData.get("name") as string;
  const color = formData.get("color") as string;
  const icon = formData.get("icon") as string | null;

  if (!name?.trim()) {
    return { error: "Name is required" };
  }

  try {
    const category = await prisma.recipe_categories.findUnique({
      where: { id: categoryId },
    });
    if (!category) return { error: "Category not found" };

    const access = await assertRowAccess(userId, category);
    if ("error" in access) return access;

    await prisma.recipe_categories.update({
      where: { id: categoryId },
      data: {
        name: name.trim(),
        color: color || DEFAULT_COLOR,
        icon: icon || null,
        updated_at: new Date(),
      },
    });

    revalidatePath(MEAL_PLANNING_PATH);
    return { success: true as const };
  } catch (error) {
    console.error("Error updating recipe category:", error);
    return { error: "Failed to update recipe category" };
  }
}

export async function deleteRecipeCategory(categoryId: string, userId: string) {
  try {
    const category = await prisma.recipe_categories.findUnique({
      where: { id: categoryId },
    });
    if (!category) return { error: "Category not found" };

    const access = await assertRowAccess(userId, category);
    if ("error" in access) return access;

    // recipes.category_id is ON DELETE RESTRICT, so report this clearly instead
    // of letting the database throw a foreign key error at the user.
    const recipeCount = await prisma.recipes.count({
      where: { category_id: categoryId },
    });

    if (recipeCount > 0) {
      return {
        error: `This category still has ${recipeCount} recipe${
          recipeCount === 1 ? "" : "s"
        }. Move or delete them first.`,
      };
    }

    await prisma.recipe_categories.delete({ where: { id: categoryId } });

    revalidatePath(MEAL_PLANNING_PATH);
    return { success: true as const };
  } catch (error) {
    console.error("Error deleting recipe category:", error);
    return { error: "Failed to delete recipe category" };
  }
}

export async function updateRecipeCategoryOrder(
  categoryIds: string[],
  userId: string
) {
  try {
    const groupIds = await getUserGroupIds(userId);

    // updateMany with the scope in the filter means an id the user cannot reach
    // simply updates nothing, rather than reordering someone else's board.
    await prisma.$transaction(
      categoryIds.map((categoryId, index) =>
        prisma.recipe_categories.updateMany({
          where: {
            id: categoryId,
            OR: [{ user_id: userId }, { group_id: { in: groupIds } }],
          },
          data: { display_order: index },
        })
      )
    );

    revalidatePath(MEAL_PLANNING_PATH);
    return { success: true as const };
  } catch (error) {
    console.error("Error updating recipe category order:", error);
    return { error: "Failed to update category order" };
  }
}

/**
 * One-tap setup for an empty board, mirroring the user's Notion columns.
 */
export async function createStarterRecipeCategories(
  userId: string,
  groupId?: string
) {
  const access = await assertScopeAccess(userId, groupId);
  if ("error" in access) return access;

  try {
    const existing = await prisma.recipe_categories.count({
      where: scopeWhere(userId, groupId),
    });

    if (existing > 0) {
      return { error: "This board already has categories" };
    }

    await prisma.recipe_categories.createMany({
      data: STARTER_CATEGORIES.map((cat, index) => ({
        name: cat.name,
        color: cat.color,
        icon: cat.icon,
        display_order: index,
        ...scopeOwnership(userId, groupId),
      })),
    });

    revalidatePath(MEAL_PLANNING_PATH);
    return { success: true as const };
  } catch (error) {
    console.error("Error creating starter recipe categories:", error);
    return { error: "Failed to create starter categories" };
  }
}

// --- Client wrappers ---

export async function createRecipeCategoryFromClient(formData: FormData) {
  const auth = await getAuthenticatedUserId();
  if ("error" in auth) return auth;

  return createRecipeCategory(formData, auth.userId);
}

export async function updateRecipeCategoryFromClient(
  categoryId: string,
  formData: FormData
) {
  const auth = await getAuthenticatedUserId();
  if ("error" in auth) return auth;

  return updateRecipeCategory(categoryId, formData, auth.userId);
}

export async function deleteRecipeCategoryFromClient(categoryId: string) {
  const auth = await getAuthenticatedUserId();
  if ("error" in auth) return auth;

  return deleteRecipeCategory(categoryId, auth.userId);
}

export async function updateRecipeCategoryOrderFromClient(categoryIds: string[]) {
  const auth = await getAuthenticatedUserId();
  if ("error" in auth) return auth;

  return updateRecipeCategoryOrder(categoryIds, auth.userId);
}

export async function createStarterRecipeCategoriesFromClient(groupId?: string) {
  const auth = await getAuthenticatedUserId();
  if ("error" in auth) return auth;

  return createStarterRecipeCategories(auth.userId, groupId);
}
