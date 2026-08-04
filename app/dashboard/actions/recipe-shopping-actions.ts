"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { getAuthenticatedUserId } from "@/lib/utils/user";
import { assertRowAccess, scopeWhere, scopeOwnership } from "@/lib/utils/scope";
import { getSavedItemDisplayName } from "@/lib/utils/saved-items";
import { shoppingMergeKey } from "@/lib/shopping/merge";

const MEAL_PLANNING_PATH = "/dashboard/meal-planning";
const SHOPPING_LIST_PATH = "/dashboard/shopping-list";

export interface ShoppingPreviewIngredient {
  ingredientId: string;
  rawName: string;
  /** Name it will take on the shopping list (the catalog entry's name). */
  listName: string | null;
  quantity: number | null;
  unit: string | null;
  linked: boolean;
  categoryName: string | null;
  categoryColor: string | null;
  categoryIcon: string | null;
  /** An uncompleted list item this would merge into. */
  existingQuantity: number | null;
  existingUnit: string | null;
}

export interface RemovalCandidate {
  itemId: string;
  name: string;
  quantity: number;
  unit: string | null;
  /** Other planned recipes that also need this item. */
  alsoUsedBy: number;
}

export interface IngredientSelectionInput {
  ingredientId: string;
  quantity?: number | null;
  unit?: string | null;
}

async function loadRecipeForUser(recipeId: string, userId: string) {
  const recipe = await prisma.recipes.findUnique({
    where: { id: recipeId },
    select: {
      id: true,
      name: true,
      user_id: true,
      group_id: true,
      recipe_ingredients: {
        orderBy: { display_order: "asc" },
        include: {
          saved_items: {
            select: {
              id: true,
              names: true,
              category_id: true,
              shopping_categories: { select: { name: true, color: true, icon: true } },
            },
          },
        },
      },
    },
  });

  if (!recipe) return { error: "Recipe not found" as const };

  const access = await assertRowAccess(userId, recipe);
  if ("error" in access) return { error: access.error };

  return { recipe };
}

/**
 * What would happen if this recipe's ingredients were pushed to the list.
 * Unlinked ingredients are reported but cannot be added — without a catalog
 * entry there is no name or shopping category to file them under.
 */
export async function getRecipeShoppingPreview(recipeId: string, userId: string) {
  try {
    const loaded = await loadRecipeForUser(recipeId, userId);
    if ("error" in loaded) return loaded;
    const { recipe } = loaded;

    const existingItems = await prisma.shopping_list_items.findMany({
      where: {
        ...scopeWhere(userId, recipe.group_id),
        completed: false,
      },
      select: { name: true, quantity: true, unit: true },
    });

    const byKey = new Map(
      existingItems.map((item) => [shoppingMergeKey(item.name, item.unit), item])
    );

    const ingredients: ShoppingPreviewIngredient[] = recipe.recipe_ingredients.map(
      (ingredient) => {
        const saved = ingredient.saved_items;
        const listName = saved
          ? getSavedItemDisplayName((saved.names ?? {}) as Record<string, string>)
          : null;

        const existing = listName
          ? byKey.get(shoppingMergeKey(listName, ingredient.unit))
          : undefined;

        return {
          ingredientId: ingredient.id,
          rawName: ingredient.raw_name,
          listName,
          quantity: ingredient.quantity != null ? Number(ingredient.quantity) : null,
          unit: ingredient.unit,
          linked: !!saved,
          categoryName: saved?.shopping_categories?.name ?? null,
          categoryColor: saved?.shopping_categories?.color ?? null,
          categoryIcon: saved?.shopping_categories?.icon ?? null,
          existingQuantity: existing ? Number(existing.quantity) : null,
          existingUnit: existing?.unit ?? null,
        };
      }
    );

    return { success: true as const, recipeName: recipe.name, ingredients };
  } catch (error) {
    console.error("Error building shopping preview:", error);
    return { error: "Failed to read recipe ingredients" };
  }
}

export async function addRecipeIngredientsToShoppingList(
  recipeId: string,
  selections: IngredientSelectionInput[],
  userId: string
) {
  try {
    const loaded = await loadRecipeForUser(recipeId, userId);
    if ("error" in loaded) return loaded;
    const { recipe } = loaded;

    const selectionById = new Map(selections.map((s) => [s.ingredientId, s]));

    const chosen = recipe.recipe_ingredients.filter(
      (ingredient) => selectionById.has(ingredient.id) && ingredient.saved_items
    );

    if (chosen.length === 0) {
      return { error: "Select at least one linked ingredient" };
    }

    const groupId = recipe.group_id;

    const outcome = await prisma.$transaction(async (tx) => {
      const existing = await tx.shopping_list_items.findMany({
        where: scopeWhere(userId, groupId),
        select: { id: true, name: true, quantity: true, unit: true, completed: true },
      });

      // Keyed working set, updated as we go so two ingredients that resolve to
      // the same item in one push merge with each other too.
      const byKey = new Map(
        existing.map((item) => [shoppingMergeKey(item.name, item.unit), item])
      );

      let created = 0;
      let merged = 0;

      for (const ingredient of chosen) {
        const saved = ingredient.saved_items!;
        const selection = selectionById.get(ingredient.id)!;

        const listName = getSavedItemDisplayName(
          (saved.names ?? {}) as Record<string, string>
        );
        const quantity =
          selection.quantity ??
          (ingredient.quantity != null ? Number(ingredient.quantity) : null);
        const unit = (selection.unit ?? ingredient.unit) || null;

        const key = shoppingMergeKey(listName, unit);
        const match = byKey.get(key);

        let itemId: string;

        if (match) {
          if (match.completed) {
            // Already bought on a previous trip: put it back on the list at the
            // amount this recipe needs, rather than adding to a spent total.
            const nextQuantity = quantity ?? Number(match.quantity);
            await tx.shopping_list_items.update({
              where: { id: match.id },
              data: { completed: false, quantity: nextQuantity, updated_at: new Date() },
            });
            byKey.set(key, {
              ...match,
              completed: false,
              quantity: nextQuantity as never,
            });
          } else if (quantity != null) {
            const nextQuantity = Number(match.quantity) + quantity;
            await tx.shopping_list_items.update({
              where: { id: match.id },
              data: { quantity: nextQuantity, updated_at: new Date() },
            });
            byKey.set(key, { ...match, quantity: nextQuantity as never });
          }
          itemId = match.id;
          merged++;
        } else {
          const createdItem = await tx.shopping_list_items.create({
            data: {
              name: listName,
              quantity: quantity ?? 1,
              unit,
              category_id: saved.category_id,
              completed: false,
              ...scopeOwnership(userId, groupId),
            },
            select: { id: true, name: true, quantity: true, unit: true, completed: true },
          });
          byKey.set(key, createdItem);
          itemId = createdItem.id;
          created++;
        }

        // Provenance, so removing the recipe later can offer to undo this.
        await tx.shopping_item_sources.upsert({
          where: {
            shopping_list_item_id_recipe_id: {
              shopping_list_item_id: itemId,
              recipe_id: recipeId,
            },
          },
          create: {
            shopping_list_item_id: itemId,
            recipe_id: recipeId,
            quantity,
            unit,
          },
          update: quantity != null ? { quantity: { increment: quantity } } : {},
        });
      }

      return { created, merged };
    });

    revalidatePath(MEAL_PLANNING_PATH);
    revalidatePath(SHOPPING_LIST_PATH);

    return { success: true as const, ...outcome };
  } catch (error) {
    console.error("Error adding ingredients to shopping list:", error);
    return { error: "Failed to add ingredients to the shopping list" };
  }
}

/**
 * Items this recipe put on the list that have not been bought yet. Completed
 * items are never offered — they are already in the trolley.
 */
export async function getRecipeRemovalPreview(recipeId: string, userId: string) {
  try {
    const recipe = await prisma.recipes.findUnique({
      where: { id: recipeId },
      select: { id: true, user_id: true, group_id: true },
    });
    if (!recipe) return { error: "Recipe not found" };

    const access = await assertRowAccess(userId, recipe);
    if ("error" in access) return access;

    const sources = await prisma.shopping_item_sources.findMany({
      where: { recipe_id: recipeId, shopping_list_items: { completed: false } },
      include: {
        shopping_list_items: {
          select: { id: true, name: true, quantity: true, unit: true },
        },
      },
    });

    if (sources.length === 0) {
      return { success: true as const, candidates: [] as RemovalCandidate[] };
    }

    // How many *other* recipes still on the plan also need each of these items.
    const contested = await prisma.shopping_item_sources.groupBy({
      by: ["shopping_list_item_id"],
      where: {
        shopping_list_item_id: { in: sources.map((s) => s.shopping_list_item_id) },
        recipe_id: { not: recipeId },
        recipes: { meal_plan_items: { some: {} } },
      },
      _count: { _all: true },
    });

    const contestedByItem = new Map(
      contested.map((row) => [row.shopping_list_item_id, row._count._all])
    );

    const candidates: RemovalCandidate[] = sources.map((source) => ({
      itemId: source.shopping_list_items.id,
      name: source.shopping_list_items.name,
      quantity: Number(source.shopping_list_items.quantity),
      unit: source.shopping_list_items.unit,
      alsoUsedBy: contestedByItem.get(source.shopping_list_item_id) ?? 0,
    }));

    return { success: true as const, candidates };
  } catch (error) {
    console.error("Error building removal preview:", error);
    return { error: "Failed to check the shopping list" };
  }
}

/**
 * Remove a recipe from the plan and, optionally, delete the unbought shopping
 * items it had added. Items the user chooses to keep are left completely
 * untouched — silently shrinking their quantity would be a surprise.
 */
export async function removeRecipeFromPlanWithCleanup(
  recipeId: string,
  itemIdsToRemove: string[],
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

    // Only delete items that really came from this recipe, are in the recipe's
    // scope, and have not been bought — never an id the client simply supplied.
    const deletableIds =
      itemIdsToRemove.length === 0
        ? []
        : (
            await prisma.shopping_item_sources.findMany({
              where: {
                recipe_id: recipeId,
                shopping_list_item_id: { in: itemIdsToRemove },
                shopping_list_items: {
                  completed: false,
                  ...scopeWhere(userId, recipe.group_id),
                },
              },
              select: { shopping_list_item_id: true },
            })
          ).map((source) => source.shopping_list_item_id);

    await prisma.$transaction([
      // Sources cascade with the items.
      prisma.shopping_list_items.deleteMany({ where: { id: { in: deletableIds } } }),
      prisma.shopping_item_sources.deleteMany({ where: { recipe_id: recipeId } }),
      prisma.meal_plan_items.deleteMany({
        where: {
          recipe_id: recipeId,
          user_id: recipe.group_id ? null : userId,
          group_id: recipe.group_id,
        },
      }),
    ]);

    revalidatePath(MEAL_PLANNING_PATH);
    revalidatePath(SHOPPING_LIST_PATH);

    return { success: true as const, removedItems: deletableIds.length };
  } catch (error) {
    console.error("Error removing recipe with cleanup:", error);
    return { error: "Failed to remove recipe from plan" };
  }
}

// --- Client wrappers ---

export async function getRecipeShoppingPreviewFromClient(recipeId: string) {
  const auth = await getAuthenticatedUserId();
  if ("error" in auth) return auth;

  return getRecipeShoppingPreview(recipeId, auth.userId);
}

export async function addRecipeIngredientsToShoppingListFromClient(
  recipeId: string,
  selections: IngredientSelectionInput[]
) {
  const auth = await getAuthenticatedUserId();
  if ("error" in auth) return auth;

  return addRecipeIngredientsToShoppingList(recipeId, selections, auth.userId);
}

export async function getRecipeRemovalPreviewFromClient(recipeId: string) {
  const auth = await getAuthenticatedUserId();
  if ("error" in auth) return auth;

  return getRecipeRemovalPreview(recipeId, auth.userId);
}

export async function removeRecipeFromPlanWithCleanupFromClient(
  recipeId: string,
  itemIdsToRemove: string[]
) {
  const auth = await getAuthenticatedUserId();
  if ("error" in auth) return auth;

  return removeRecipeFromPlanWithCleanup(recipeId, itemIdsToRemove, auth.userId);
}
