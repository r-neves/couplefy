"use client";

import { RecipeCard } from "./recipe-card";
import type { RecipeDTO } from "@/app/dashboard/actions/recipes-actions";
import type { RecipeCategoryDTO } from "@/app/dashboard/actions/recipe-categories-actions";
import { cn } from "@/lib/utils";

interface RecipeLibraryProps {
  categories: RecipeCategoryDTO[];
  recipesByCategory: Record<string, RecipeDTO[]>;
  /** Mobile-only filter: a category id, or "all". */
  activeCategoryId: string;
  /** Recipe ids currently on the plan. */
  planRecipeIds: Set<string>;
  onTogglePlan: (recipe: RecipeDTO, nextInPlan: boolean) => void;
  onEdit: (recipe: RecipeDTO) => void;
  onDelete: (recipe: RecipeDTO) => void;
}

/**
 * The Notion board, responsively: side-by-side scrollable columns from `lg` up,
 * stacked sections below that (where columns would be unusable on a phone).
 */
export function RecipeLibrary({
  categories,
  recipesByCategory,
  activeCategoryId,
  planRecipeIds,
  onTogglePlan,
  onEdit,
  onDelete,
}: RecipeLibraryProps) {
  const visibleCategories =
    activeCategoryId === "all"
      ? categories
      : categories.filter((category) => category.id === activeCategoryId);

  return (
    <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:overflow-x-auto lg:pb-4">
      {visibleCategories.map((category) => {
        const recipes = recipesByCategory[category.id] ?? [];

        return (
          <section
            key={category.id}
            className={cn(
              "rounded-xl border bg-white/60 p-3 dark:bg-gray-900/60",
              "lg:w-72 lg:flex-shrink-0"
            )}
          >
            <header className="mb-3 flex items-center gap-2 px-1">
              {category.icon ? (
                <span className="text-lg leading-none">{category.icon}</span>
              ) : (
                <div
                  className="h-3 w-3 rounded-full"
                  style={{ backgroundColor: category.color || "#6366f1" }}
                />
              )}
              <h3 className="font-semibold">{category.name}</h3>
              <span className="ml-auto rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                {recipes.length}
              </span>
            </header>

            <div className="space-y-2">
              {recipes.length === 0 ? (
                <p className="px-1 py-4 text-center text-sm text-muted-foreground">
                  No recipes here yet.
                </p>
              ) : (
                recipes.map((recipe) => (
                  <RecipeCard
                    key={recipe.id}
                    recipe={recipe}
                    inPlan={planRecipeIds.has(recipe.id)}
                    onTogglePlan={onTogglePlan}
                    onEdit={onEdit}
                    onDelete={onDelete}
                  />
                ))
              )}
            </div>
          </section>
        );
      })}
    </div>
  );
}
