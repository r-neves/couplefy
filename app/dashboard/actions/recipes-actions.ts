"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { getAuthenticatedUserId } from "@/lib/utils/user";
import { assertScopeAccess, assertRowAccess, scopeWhere, scopeOwnership } from "@/lib/utils/scope";
import { detectSourceType, type RecipeSourceType } from "@/lib/recipes/source";
import type { Prisma } from "@/lib/generated/prisma";

const MEAL_PLANNING_PATH = "/dashboard/meal-planning";

const MAX_NAME_LENGTH = 255;
const MAX_NOTES_LENGTH = 5000;
const MAX_LINKS = 10;
const MAX_LABEL_LENGTH = 100;
const MAX_INGREDIENTS = 60;
const MAX_INGREDIENT_NAME_LENGTH = 255;
const MAX_UNIT_LENGTH = 50;

export interface RecipeLinkInput {
  url: string;
  label?: string | null;
}

export interface RecipeIngredientInput {
  /** Catalog entry this ingredient resolves to, when it has been linked. */
  savedItemId?: string | null;
  /** What this recipe calls it, e.g. "tomate cherry". */
  rawName: string;
  quantity?: number | null;
  unit?: string | null;
}

export interface RecipeInput {
  name: string;
  categoryId: string;
  servings?: number | null;
  notes?: string | null;
  links?: RecipeLinkInput[];
  ingredients?: RecipeIngredientInput[];
  groupId?: string | null;
}

export interface RecipeIngredientDTO {
  id: string;
  savedItemId: string | null;
  rawName: string;
  quantity: number | null;
  unit: string | null;
  displayOrder: number;
}

export interface RecipeLinkDTO {
  id: string;
  url: string;
  label: string | null;
  sourceType: RecipeSourceType;
  displayOrder: number;
}

export interface RecipeDTO {
  id: string;
  userId: string | null;
  groupId: string | null;
  categoryId: string;
  name: string;
  notes: string | null;
  servings: number | null;
  lastCookedAt: string | null;
  links: RecipeLinkDTO[];
  ingredients: RecipeIngredientDTO[];
  ingredientCount: number;
}

/**
 * A recipe and its category must live in the same scope, otherwise a personal
 * recipe could be filed under a group's category (or vice versa) and would show
 * up on the wrong board.
 */
async function assertCategoryInScope(
  categoryId: string,
  userId: string,
  groupId?: string | null
): Promise<{ ok: true } | { error: string }> {
  const category = await prisma.recipe_categories.findUnique({
    where: { id: categoryId },
    select: { user_id: true, group_id: true },
  });

  if (!category) return { error: "Category not found" };

  const inScope = groupId
    ? category.group_id === groupId
    : category.user_id === userId && category.group_id === null;

  return inScope ? { ok: true } : { error: "Category belongs to a different board" };
}

function normalizeLinks(links: RecipeLinkInput[] | undefined) {
  return (links ?? [])
    .map((link) => ({ ...link, url: link.url?.trim() ?? "" }))
    .filter((link) => link.url.length > 0)
    .slice(0, MAX_LINKS)
    .map((link, index) => ({
      url: link.url,
      label: link.label?.trim().slice(0, MAX_LABEL_LENGTH) || null,
      source_type: detectSourceType(link.url) as RecipeSourceType,
      display_order: index,
    }));
}

function normalizeIngredients(ingredients: RecipeIngredientInput[] | undefined) {
  return (ingredients ?? [])
    .map((ingredient) => ({
      ...ingredient,
      rawName: ingredient.rawName?.trim() ?? "",
    }))
    .filter((ingredient) => ingredient.rawName.length > 0)
    .slice(0, MAX_INGREDIENTS)
    .map((ingredient, index) => ({
      saved_item_id: ingredient.savedItemId || null,
      raw_name: ingredient.rawName.slice(0, MAX_INGREDIENT_NAME_LENGTH),
      quantity:
        ingredient.quantity != null && Number.isFinite(ingredient.quantity)
          ? ingredient.quantity
          : null,
      unit: ingredient.unit?.trim().slice(0, MAX_UNIT_LENGTH) || null,
      display_order: index,
    }));
}

/**
 * An ingredient may only point at a catalog entry from the same board,
 * otherwise a personal recipe could reference a group's saved item (and would
 * later push shopping items into the wrong list).
 */
async function assertSavedItemsInScope(
  savedItemIds: string[],
  userId: string,
  groupId?: string | null
): Promise<{ ok: true } | { error: string }> {
  const uniqueIds = [...new Set(savedItemIds)];
  if (uniqueIds.length === 0) return { ok: true };

  const reachable = await prisma.saved_items.count({
    where: {
      id: { in: uniqueIds },
      ...(groupId ? { group_id: groupId } : { user_id: userId, group_id: null }),
    },
  });

  return reachable === uniqueIds.length
    ? { ok: true }
    : { error: "An ingredient refers to an item from a different board" };
}

function validateInput(input: RecipeInput): string | null {
  if (!input.name?.trim()) return "Name is required";
  if (input.name.trim().length > MAX_NAME_LENGTH) return "Name is too long";
  if (!input.categoryId) return "Category is required";
  if (input.notes && input.notes.length > MAX_NOTES_LENGTH) return "Notes are too long";
  if (input.servings != null && (!Number.isInteger(input.servings) || input.servings < 1 || input.servings > 99)) {
    return "Servings must be a whole number between 1 and 99";
  }
  if (
    input.ingredients?.some(
      (ingredient) =>
        ingredient.quantity != null &&
        (!Number.isFinite(ingredient.quantity) || ingredient.quantity < 0)
    )
  ) {
    return "Ingredient quantities must be positive numbers";
  }
  return null;
}

function toDTO(recipe: {
  id: string;
  user_id: string | null;
  group_id: string | null;
  category_id: string;
  name: string;
  notes: string | null;
  servings: number | null;
  last_cooked_at: Date | null;
  recipe_links: {
    id: string;
    url: string;
    label: string | null;
    source_type: string;
    display_order: number;
  }[];
  recipe_ingredients: {
    id: string;
    saved_item_id: string | null;
    raw_name: string;
    quantity: Prisma.Decimal | null;
    unit: string | null;
    display_order: number;
  }[];
  _count: { recipe_ingredients: number };
}): RecipeDTO {
  return {
    id: recipe.id,
    userId: recipe.user_id,
    groupId: recipe.group_id,
    categoryId: recipe.category_id,
    name: recipe.name,
    notes: recipe.notes,
    servings: recipe.servings,
    lastCookedAt: recipe.last_cooked_at ? recipe.last_cooked_at.toISOString() : null,
    links: recipe.recipe_links.map((link) => ({
      id: link.id,
      url: link.url,
      label: link.label,
      sourceType: link.source_type as RecipeSourceType,
      displayOrder: link.display_order,
    })),
    // Decimal is not serializable across the server/client boundary.
    ingredients: recipe.recipe_ingredients.map((ingredient) => ({
      id: ingredient.id,
      savedItemId: ingredient.saved_item_id,
      rawName: ingredient.raw_name,
      quantity: ingredient.quantity != null ? Number(ingredient.quantity) : null,
      unit: ingredient.unit,
      displayOrder: ingredient.display_order,
    })),
    ingredientCount: recipe._count.recipe_ingredients,
  };
}

const recipeInclude = {
  recipe_links: { orderBy: { display_order: "asc" } },
  recipe_ingredients: { orderBy: { display_order: "asc" } },
  _count: { select: { recipe_ingredients: true } },
} as const;

export async function createRecipe(input: RecipeInput, userId: string) {
  const validationError = validateInput(input);
  if (validationError) return { error: validationError };

  const groupId = input.groupId || null;

  const access = await assertScopeAccess(userId, groupId);
  if ("error" in access) return access;

  const categoryCheck = await assertCategoryInScope(input.categoryId, userId, groupId);
  if ("error" in categoryCheck) return categoryCheck;

  const ingredients = normalizeIngredients(input.ingredients);
  const savedItemCheck = await assertSavedItemsInScope(
    ingredients.map((i) => i.saved_item_id).filter((id): id is string => !!id),
    userId,
    groupId
  );
  if ("error" in savedItemCheck) return savedItemCheck;

  try {
    const recipe = await prisma.recipes.create({
      data: {
        name: input.name.trim(),
        category_id: input.categoryId,
        servings: input.servings ?? null,
        notes: input.notes?.trim() || null,
        ...scopeOwnership(userId, groupId),
        recipe_links: { create: normalizeLinks(input.links) },
        recipe_ingredients: { create: ingredients },
      },
    });

    revalidatePath(MEAL_PLANNING_PATH);
    return { success: true as const, recipeId: recipe.id };
  } catch (error) {
    console.error("Error creating recipe:", error);
    return { error: "Failed to create recipe" };
  }
}

export async function getRecipes(userId: string, groupId?: string) {
  try {
    if (groupId) {
      const access = await assertScopeAccess(userId, groupId);
      if ("error" in access) return access;
    }

    const recipes = await prisma.recipes.findMany({
      where: scopeWhere(userId, groupId),
      include: recipeInclude,
      orderBy: { name: "asc" },
    });

    return { success: true as const, recipes: recipes.map(toDTO) };
  } catch (error) {
    console.error("Error getting recipes:", error);
    return { error: "Failed to get recipes" };
  }
}

export async function updateRecipe(recipeId: string, input: RecipeInput, userId: string) {
  const validationError = validateInput(input);
  if (validationError) return { error: validationError };

  try {
    const recipe = await prisma.recipes.findUnique({
      where: { id: recipeId },
      select: { id: true, user_id: true, group_id: true },
    });
    if (!recipe) return { error: "Recipe not found" };

    const access = await assertRowAccess(userId, recipe);
    if ("error" in access) return access;

    // Validate against the recipe's own scope, not one supplied by the client.
    const categoryCheck = await assertCategoryInScope(input.categoryId, userId, recipe.group_id);
    if ("error" in categoryCheck) return categoryCheck;

    const ingredients = normalizeIngredients(input.ingredients);
    const savedItemCheck = await assertSavedItemsInScope(
      ingredients.map((i) => i.saved_item_id).filter((id): id is string => !!id),
      userId,
      recipe.group_id
    );
    if ("error" in savedItemCheck) return savedItemCheck;

    // Links and ingredients are small ordered lists with no identity of their
    // own, so replacing each set is simpler and safer than diffing it.
    await prisma.$transaction([
      prisma.recipe_links.deleteMany({ where: { recipe_id: recipeId } }),
      prisma.recipe_ingredients.deleteMany({ where: { recipe_id: recipeId } }),
      prisma.recipes.update({
        where: { id: recipeId },
        data: {
          name: input.name.trim(),
          category_id: input.categoryId,
          servings: input.servings ?? null,
          notes: input.notes?.trim() || null,
          updated_at: new Date(),
          recipe_links: { create: normalizeLinks(input.links) },
          recipe_ingredients: { create: ingredients },
        },
      }),
    ]);

    revalidatePath(MEAL_PLANNING_PATH);
    return { success: true as const };
  } catch (error) {
    console.error("Error updating recipe:", error);
    return { error: "Failed to update recipe" };
  }
}

export async function deleteRecipe(recipeId: string, userId: string) {
  try {
    const recipe = await prisma.recipes.findUnique({
      where: { id: recipeId },
      select: { id: true, user_id: true, group_id: true },
    });
    if (!recipe) return { error: "Recipe not found" };

    const access = await assertRowAccess(userId, recipe);
    if ("error" in access) return access;

    // Links, ingredients and plan entries cascade.
    await prisma.recipes.delete({ where: { id: recipeId } });

    revalidatePath(MEAL_PLANNING_PATH);
    return { success: true as const };
  } catch (error) {
    console.error("Error deleting recipe:", error);
    return { error: "Failed to delete recipe" };
  }
}

// --- Client wrappers ---

export async function createRecipeFromClient(input: RecipeInput) {
  const auth = await getAuthenticatedUserId();
  if ("error" in auth) return auth;

  return createRecipe(input, auth.userId);
}

export async function updateRecipeFromClient(recipeId: string, input: RecipeInput) {
  const auth = await getAuthenticatedUserId();
  if ("error" in auth) return auth;

  return updateRecipe(recipeId, input, auth.userId);
}

export async function deleteRecipeFromClient(recipeId: string) {
  const auth = await getAuthenticatedUserId();
  if ("error" in auth) return auth;

  return deleteRecipe(recipeId, auth.userId);
}
