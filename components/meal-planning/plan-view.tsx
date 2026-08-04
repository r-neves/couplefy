"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ChefHat, ShoppingCart, UtensilsCrossed, Users, X } from "lucide-react";
import type { RecipeDTO } from "@/app/dashboard/actions/recipes-actions";
import type { RecipeCategoryDTO } from "@/app/dashboard/actions/recipe-categories-actions";
import { RecipeLinkChips } from "./recipe-link-chips";

interface PlanViewProps {
  /** Recipes currently on the plan, in the order they were added. */
  recipes: RecipeDTO[];
  categories: RecipeCategoryDTO[];
  onCooked: (recipe: RecipeDTO) => void;
  onRemove: (recipe: RecipeDTO) => void;
  onAddToList: (recipe: RecipeDTO) => void;
  onBrowseLibrary: () => void;
}

export function PlanView({
  recipes,
  categories,
  onCooked,
  onRemove,
  onAddToList,
  onBrowseLibrary,
}: PlanViewProps) {
  if (recipes.length === 0) {
    return (
      <Card className="bg-white/50 backdrop-blur-sm dark:bg-gray-900/50">
        <CardContent className="flex flex-col items-center gap-4 py-12 text-center">
          <UtensilsCrossed className="h-10 w-10 text-muted-foreground" />
          <div>
            <h3 className="text-lg font-semibold">Nothing planned yet</h3>
            <p className="mt-1 max-w-md text-sm text-muted-foreground">
              Pick recipes from your library and they will show up here until you
              cook them.
            </p>
          </div>
          <Button onClick={onBrowseLibrary} size="lg">
            Browse library
          </Button>
        </CardContent>
      </Card>
    );
  }

  // Group by type so the plan reads like the board it came from.
  const byCategory = categories
    .map((category) => ({
      category,
      recipes: recipes.filter((recipe) => recipe.categoryId === category.id),
    }))
    .filter((group) => group.recipes.length > 0);

  return (
    <div className="space-y-5">
      {byCategory.map(({ category, recipes: groupRecipes }) => (
        <section key={category.id}>
          <header className="mb-2 flex items-center gap-2 px-1">
            {category.icon ? (
              <span className="text-base leading-none">{category.icon}</span>
            ) : (
              <div
                className="h-2.5 w-2.5 rounded-full"
                style={{ backgroundColor: category.color || "#6366f1" }}
              />
            )}
            <h3 className="text-sm font-semibold text-muted-foreground">
              {category.name}
            </h3>
          </header>

          <div className="space-y-2">
            {groupRecipes.map((recipe) => (
              <div
                key={recipe.id}
                className="rounded-lg border bg-card p-3 sm:flex sm:items-center sm:gap-3"
              >
                <div className="min-w-0 flex-1">
                  <h4 className="font-medium">{recipe.name}</h4>

                  <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                    {recipe.servings != null && (
                      <span className="inline-flex items-center gap-1">
                        <Users className="h-3 w-3" />
                        {recipe.servings}
                      </span>
                    )}
                    {recipe.ingredientCount > 0 && (
                      <span className="inline-flex items-center gap-1">
                        <ChefHat className="h-3 w-3" />
                        {recipe.ingredientCount} ingredient
                        {recipe.ingredientCount === 1 ? "" : "s"}
                      </span>
                    )}
                  </div>

                  <RecipeLinkChips links={recipe.links} className="mt-2" />
                </div>

                <div className="mt-3 flex items-center gap-2 sm:mt-0 sm:flex-shrink-0">
                  {recipe.ingredientCount > 0 && (
                    <Button
                      variant="outline"
                      size="default"
                      className="h-11 flex-1 sm:flex-none"
                      onClick={() => onAddToList(recipe)}
                    >
                      <ShoppingCart className="h-4 w-4 sm:mr-2" />
                      <span className="hidden sm:inline">Add to list</span>
                    </Button>
                  )}
                  <Button
                    size="default"
                    className="h-11 flex-1 sm:flex-none"
                    onClick={() => onCooked(recipe)}
                  >
                    <ChefHat className="mr-2 h-4 w-4" />
                    Cooked
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-11 w-11 flex-shrink-0 text-muted-foreground hover:text-destructive"
                    onClick={() => onRemove(recipe)}
                    aria-label={`Remove ${recipe.name} from plan`}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
