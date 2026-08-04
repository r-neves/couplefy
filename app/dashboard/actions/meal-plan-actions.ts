"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { getAuthenticatedUserId } from "@/lib/utils/user";
import { assertScopeAccess, assertRowAccess, scopeWhere } from "@/lib/utils/scope";

const MEAL_PLANNING_PATH = "/dashboard/meal-planning";

export interface MealPlanItemDTO {
  id: string;
  recipeId: string;
  addedAt: string;
}

/**
 * The plan is a rolling selection with no plan entity: one row per recipe that
 * is currently "on the list" for a board. A plan item always inherits its
 * recipe's scope, so it can never end up on a different board than the recipe.
 */
export async function getMealPlanItems(userId: string, groupId?: string) {
  try {
    if (groupId) {
      const access = await assertScopeAccess(userId, groupId);
      if ("error" in access) return access;
    }

    const items = await prisma.meal_plan_items.findMany({
      where: scopeWhere(userId, groupId),
      orderBy: { added_at: "desc" },
      select: { id: true, recipe_id: true, added_at: true },
    });

    const planItems: MealPlanItemDTO[] = items.map((item) => ({
      id: item.id,
      recipeId: item.recipe_id,
      addedAt: item.added_at.toISOString(),
    }));

    return { success: true as const, planItems };
  } catch (error) {
    console.error("Error getting meal plan items:", error);
    return { error: "Failed to get meal plan" };
  }
}

export async function addRecipeToPlan(recipeId: string, userId: string) {
  try {
    const recipe = await prisma.recipes.findUnique({
      where: { id: recipeId },
      select: { id: true, user_id: true, group_id: true },
    });
    if (!recipe) return { error: "Recipe not found" };

    const access = await assertRowAccess(userId, recipe);
    if ("error" in access) return access;

    // Adding twice is a no-op rather than an error — the button can be tapped
    // again before the list has refreshed.
    const existing = await prisma.meal_plan_items.findFirst({
      where: {
        recipe_id: recipeId,
        user_id: recipe.group_id ? null : userId,
        group_id: recipe.group_id,
      },
      select: { id: true },
    });

    if (existing) {
      revalidatePath(MEAL_PLANNING_PATH);
      return { success: true as const, planItemId: existing.id };
    }

    const planItem = await prisma.meal_plan_items.create({
      data: {
        recipe_id: recipeId,
        user_id: recipe.group_id ? null : userId,
        group_id: recipe.group_id,
      },
    });

    revalidatePath(MEAL_PLANNING_PATH);
    return { success: true as const, planItemId: planItem.id };
  } catch (error) {
    console.error("Error adding recipe to plan:", error);
    return { error: "Failed to add recipe to plan" };
  }
}

/**
 * Take a recipe off the plan without recording that it was cooked.
 *
 * Phase 4 will additionally offer to remove the still-unbought shopping items
 * this recipe contributed, using shopping_item_sources.
 */
export async function removeRecipeFromPlan(recipeId: string, userId: string) {
  try {
    const recipe = await prisma.recipes.findUnique({
      where: { id: recipeId },
      select: { id: true, user_id: true, group_id: true },
    });
    if (!recipe) return { error: "Recipe not found" };

    const access = await assertRowAccess(userId, recipe);
    if ("error" in access) return access;

    await prisma.meal_plan_items.deleteMany({
      where: {
        recipe_id: recipeId,
        user_id: recipe.group_id ? null : userId,
        group_id: recipe.group_id,
      },
    });

    revalidatePath(MEAL_PLANNING_PATH);
    return { success: true as const };
  } catch (error) {
    console.error("Error removing recipe from plan:", error);
    return { error: "Failed to remove recipe from plan" };
  }
}

/**
 * Mark a recipe cooked: it leaves the plan immediately and the recipe records
 * when it was last cooked. The previous last_cooked_at is returned so an undo
 * can restore the exact prior state rather than guessing.
 */
export async function markRecipeCooked(recipeId: string, userId: string) {
  try {
    const recipe = await prisma.recipes.findUnique({
      where: { id: recipeId },
      select: { id: true, user_id: true, group_id: true, last_cooked_at: true },
    });
    if (!recipe) return { error: "Recipe not found" };

    const access = await assertRowAccess(userId, recipe);
    if ("error" in access) return access;

    const previousLastCookedAt = recipe.last_cooked_at
      ? recipe.last_cooked_at.toISOString()
      : null;

    await prisma.$transaction([
      prisma.meal_plan_items.deleteMany({
        where: {
          recipe_id: recipeId,
          user_id: recipe.group_id ? null : userId,
          group_id: recipe.group_id,
        },
      }),
      prisma.recipes.update({
        where: { id: recipeId },
        data: { last_cooked_at: new Date() },
      }),
    ]);

    revalidatePath(MEAL_PLANNING_PATH);
    return { success: true as const, previousLastCookedAt };
  } catch (error) {
    console.error("Error marking recipe cooked:", error);
    return { error: "Failed to mark recipe as cooked" };
  }
}

/**
 * Undo a "cooked" tap: put the recipe back on the plan and restore the
 * last_cooked_at it had before.
 */
export async function undoRecipeCooked(
  recipeId: string,
  previousLastCookedAt: string | null,
  userId: string
) {
  try {
    const recipe = await prisma.recipes.findUnique({
      where: { id: recipeId },
      select: { id: true, user_id: true, group_id: true },
    });
    if (!recipe) return { error: "Recipe not found" };

    const access = await assertRowAccess(userId, recipe);
    if ("error" in access) return access;

    const alreadyOnPlan = await prisma.meal_plan_items.findFirst({
      where: {
        recipe_id: recipeId,
        user_id: recipe.group_id ? null : userId,
        group_id: recipe.group_id,
      },
      select: { id: true },
    });

    await prisma.$transaction([
      ...(alreadyOnPlan
        ? []
        : [
            prisma.meal_plan_items.create({
              data: {
                recipe_id: recipeId,
                user_id: recipe.group_id ? null : userId,
                group_id: recipe.group_id,
              },
            }),
          ]),
      prisma.recipes.update({
        where: { id: recipeId },
        data: {
          last_cooked_at: previousLastCookedAt ? new Date(previousLastCookedAt) : null,
        },
      }),
    ]);

    revalidatePath(MEAL_PLANNING_PATH);
    return { success: true as const };
  } catch (error) {
    console.error("Error undoing cooked recipe:", error);
    return { error: "Failed to undo" };
  }
}

/** Clear the whole plan for a board. */
export async function clearMealPlan(userId: string, groupId?: string) {
  try {
    const access = await assertScopeAccess(userId, groupId);
    if ("error" in access) return access;

    await prisma.meal_plan_items.deleteMany({ where: scopeWhere(userId, groupId) });

    revalidatePath(MEAL_PLANNING_PATH);
    return { success: true as const };
  } catch (error) {
    console.error("Error clearing meal plan:", error);
    return { error: "Failed to clear meal plan" };
  }
}

// --- Client wrappers ---

export async function addRecipeToPlanFromClient(recipeId: string) {
  const auth = await getAuthenticatedUserId();
  if ("error" in auth) return auth;

  return addRecipeToPlan(recipeId, auth.userId);
}

export async function removeRecipeFromPlanFromClient(recipeId: string) {
  const auth = await getAuthenticatedUserId();
  if ("error" in auth) return auth;

  return removeRecipeFromPlan(recipeId, auth.userId);
}

export async function markRecipeCookedFromClient(recipeId: string) {
  const auth = await getAuthenticatedUserId();
  if ("error" in auth) return auth;

  return markRecipeCooked(recipeId, auth.userId);
}

export async function undoRecipeCookedFromClient(
  recipeId: string,
  previousLastCookedAt: string | null
) {
  const auth = await getAuthenticatedUserId();
  if ("error" in auth) return auth;

  return undoRecipeCooked(recipeId, previousLastCookedAt, auth.userId);
}

export async function clearMealPlanFromClient(groupId?: string) {
  const auth = await getAuthenticatedUserId();
  if ("error" in auth) return auth;

  return clearMealPlan(auth.userId, groupId);
}
