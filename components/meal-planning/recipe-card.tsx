"use client";

import { Button } from "@/components/ui/button";
import { Check, ChefHat, Edit2, Plus, Trash2, Users } from "lucide-react";
import type { RecipeDTO } from "@/app/dashboard/actions/recipes-actions";
import { RecipeLinkChips } from "./recipe-link-chips";
import { formatLastCooked } from "./format-last-cooked";
import { cn } from "@/lib/utils";

interface RecipeCardProps {
  recipe: RecipeDTO;
  inPlan: boolean;
  onTogglePlan: (recipe: RecipeDTO, nextInPlan: boolean) => void;
  onEdit: (recipe: RecipeDTO) => void;
  onDelete: (recipe: RecipeDTO) => void;
}

export function RecipeCard({
  recipe,
  inPlan,
  onTogglePlan,
  onEdit,
  onDelete,
}: RecipeCardProps) {
  return (
    <div
      className={cn(
        "group rounded-lg border bg-card p-3 transition-colors",
        inPlan ? "border-primary/50 bg-primary/5" : "hover:border-primary/40"
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          {/* No category marker here: cards only ever render inside their own
              category column, whose header already states the type. */}
          <h4 className="truncate font-medium">{recipe.name}</h4>

          {recipe.notes && (
            <p className="mt-1.5 line-clamp-2 text-xs text-muted-foreground">
              {recipe.notes}
            </p>
          )}

          <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
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
            {recipe.lastCookedAt && <span>{formatLastCooked(recipe.lastCookedAt)}</span>}
          </div>

          <RecipeLinkChips links={recipe.links} className="mt-2" />
        </div>

        <div className="flex flex-shrink-0 items-center">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-muted-foreground hover:text-primary"
            onClick={() => onEdit(recipe)}
            aria-label={`Edit ${recipe.name}`}
          >
            <Edit2 className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-muted-foreground hover:text-destructive"
            onClick={() => onDelete(recipe)}
            aria-label={`Delete ${recipe.name}`}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <Button
        variant={inPlan ? "secondary" : "outline"}
        size="sm"
        className="mt-3 h-9 w-full"
        onClick={() => onTogglePlan(recipe, !inPlan)}
      >
        {inPlan ? (
          <>
            <Check className="mr-2 h-4 w-4" />
            In plan
          </>
        ) : (
          <>
            <Plus className="mr-2 h-4 w-4" />
            Add to plan
          </>
        )}
      </Button>
    </div>
  );
}
