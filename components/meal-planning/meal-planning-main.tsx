"use client";

import { useCallback, useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  ClipboardList,
  LibraryBig,
  Plus,
  RefreshCw,
  Search,
  Sparkles,
  Trash2,
  User,
  Users,
} from "lucide-react";
import { RecipeLibrary } from "./recipe-library";
import { PlanView } from "./plan-view";
import { RecipeDialog } from "./recipe-dialog";
import { ManageRecipeCategories } from "./manage-recipe-categories";
import {
  deleteRecipeFromClient,
  type RecipeDTO,
} from "@/app/dashboard/actions/recipes-actions";
import {
  createStarterRecipeCategoriesFromClient,
  type RecipeCategoryDTO,
} from "@/app/dashboard/actions/recipe-categories-actions";
import {
  addRecipeToPlanFromClient,
  clearMealPlanFromClient,
  markRecipeCookedFromClient,
  removeRecipeFromPlanFromClient,
  undoRecipeCookedFromClient,
  type MealPlanItemDTO,
} from "@/app/dashboard/actions/meal-plan-actions";
import {
  getRecipeRemovalPreviewFromClient,
  removeRecipeFromPlanWithCleanupFromClient,
  type RemovalCandidate,
} from "@/app/dashboard/actions/recipe-shopping-actions";
import { AddToListDialog } from "./add-to-list-dialog";
import { RemoveFromPlanDialog } from "./remove-from-plan-dialog";
import type { CatalogItemDTO } from "@/app/dashboard/actions/shopping-list-actions";
import type { ShoppingCategoryLite } from "./saved-item-combobox";
import { matchesText } from "@/lib/utils/text";
import { cn } from "@/lib/utils";

export interface MealPlanningScopeData {
  recipes: RecipeDTO[];
  categories: RecipeCategoryDTO[];
  planItems: MealPlanItemDTO[];
  catalogItems: CatalogItemDTO[];
  shoppingCategories: ShoppingCategoryLite[];
}

interface MealPlanningMainProps {
  userGroups: { id: string; name: string }[];
  initialPersonalData: MealPlanningScopeData;
  initialGroupData: (MealPlanningScopeData & { groupId: string })[];
}

const STORAGE_KEY = "meal-planning-last-view";
type Tab = "plan" | "library";

export function MealPlanningMain({
  userGroups,
  initialPersonalData,
  initialGroupData,
}: MealPlanningMainProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [activeView, setActiveView] = useState("personal");
  const [activeTab, setActiveTab] = useState<Tab>("plan");
  const [search, setSearch] = useState("");
  const [activeCategoryId, setActiveCategoryId] = useState("all");
  const [recipeDialogOpen, setRecipeDialogOpen] = useState(false);
  const [editingRecipe, setEditingRecipe] = useState<RecipeDTO | null>(null);
  const [deletingRecipe, setDeletingRecipe] = useState<RecipeDTO | null>(null);
  const [showClearPlanAlert, setShowClearPlanAlert] = useState(false);
  const [creatingStarters, setCreatingStarters] = useState(false);
  const [addToListRecipe, setAddToListRecipe] = useState<RecipeDTO | null>(null);
  const [removalRecipe, setRemovalRecipe] = useState<RecipeDTO | null>(null);
  const [removalCandidates, setRemovalCandidates] = useState<RemovalCandidate[]>([]);

  // Plan membership is held locally so taps feel instant; the server is the
  // source of truth and every mutation resyncs via router.refresh().
  const buildPlanState = useCallback(
    () => ({
      personal: initialPersonalData.planItems.map((item) => item.recipeId),
      ...Object.fromEntries(
        initialGroupData.map((group) => [
          group.groupId,
          group.planItems.map((item) => item.recipeId),
        ])
      ),
    }),
    [initialPersonalData, initialGroupData]
  );

  const [planByScope, setPlanByScope] = useState<Record<string, string[]>>(buildPlanState);

  useEffect(() => {
    setPlanByScope(buildPlanState());
  }, [buildPlanState]);

  // Restore the last used board after hydration, so server and client markup
  // match on the first render.
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (!saved) return;
      if (saved === "personal" || userGroups.some((group) => group.id === saved)) {
        setActiveView(saved);
      }
    } catch (error) {
      console.error("Failed to load saved view:", error);
    }
  }, [userGroups]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, activeView);
    } catch (error) {
      console.error("Failed to save view preference:", error);
    }
  }, [activeView]);

  // The category filter holds ids belonging to the board we just left.
  useEffect(() => {
    setActiveCategoryId("all");
  }, [activeView]);

  const data: Record<string, MealPlanningScopeData> = useMemo(
    () => ({
      personal: initialPersonalData,
      ...Object.fromEntries(initialGroupData.map((group) => [group.groupId, group])),
    }),
    [initialPersonalData, initialGroupData]
  );

  const currentData = data[activeView] ?? {
    recipes: [],
    categories: [],
    planItems: [],
    catalogItems: [],
    shoppingCategories: [],
  };
  const groupId = activeView === "personal" ? undefined : activeView;

  const planRecipeIds = useMemo(
    () => new Set(planByScope[activeView] ?? []),
    [planByScope, activeView]
  );

  const planRecipes = useMemo(() => {
    const order = planByScope[activeView] ?? [];
    const byId = new Map(currentData.recipes.map((recipe) => [recipe.id, recipe]));
    return order
      .map((recipeId) => byId.get(recipeId))
      .filter((recipe): recipe is RecipeDTO => !!recipe);
  }, [planByScope, activeView, currentData.recipes]);

  const filteredRecipes = useMemo(() => {
    if (!search.trim()) return currentData.recipes;

    return currentData.recipes.filter(
      (recipe) =>
        matchesText(recipe.name, search) ||
        (recipe.notes ? matchesText(recipe.notes, search) : false)
    );
  }, [currentData.recipes, search]);

  const recipesByCategory = useMemo(() => {
    const grouped: Record<string, RecipeDTO[]> = {};
    for (const category of currentData.categories) {
      grouped[category.id] = [];
    }
    for (const recipe of filteredRecipes) {
      (grouped[recipe.categoryId] ??= []).push(recipe);
    }
    return grouped;
  }, [currentData.categories, filteredRecipes]);

  // Counts over all recipes, not the filtered set — this drives the delete guard.
  const recipeCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const recipe of currentData.recipes) {
      counts[recipe.categoryId] = (counts[recipe.categoryId] ?? 0) + 1;
    }
    return counts;
  }, [currentData.recipes]);

  const hasCategories = currentData.categories.length > 0;

  const setPlanForScope = (scope: string, next: (previous: string[]) => string[]) => {
    setPlanByScope((prev) => ({ ...prev, [scope]: next(prev[scope] ?? []) }));
  };

  const handleTogglePlan = async (recipe: RecipeDTO, nextInPlan: boolean) => {
    const scope = activeView;
    const previous = planByScope[scope] ?? [];

    // Manual removal may have left unbought shopping items behind. Ask about
    // those first rather than removing silently. (Cooking is different — the
    // ingredients were used, so it never prompts.)
    if (!nextInPlan) {
      const preview = await getRecipeRemovalPreviewFromClient(recipe.id);

      if ("candidates" in preview && preview.candidates.length > 0) {
        setRemovalRecipe(recipe);
        setRemovalCandidates(preview.candidates);
        return;
      }
    }

    setPlanForScope(scope, (ids) =>
      nextInPlan ? [recipe.id, ...ids.filter((id) => id !== recipe.id)] : ids.filter((id) => id !== recipe.id)
    );

    try {
      const result = nextInPlan
        ? await addRecipeToPlanFromClient(recipe.id)
        : await removeRecipeFromPlanFromClient(recipe.id);

      if ("error" in result && result.error) throw new Error(result.error);
      router.refresh();
    } catch (error) {
      console.error("Failed to update plan:", error);
      setPlanByScope((prev) => ({ ...prev, [scope]: previous }));
      toast.error("Couldn't update the plan. Please try again.");
    }
  };

  const handleConfirmRemoval = async (itemIdsToRemove: string[]) => {
    if (!removalRecipe) return;

    const scope = activeView;
    const recipe = removalRecipe;
    const previous = planByScope[scope] ?? [];

    setPlanForScope(scope, (ids) => ids.filter((id) => id !== recipe.id));

    try {
      const result = await removeRecipeFromPlanWithCleanupFromClient(
        recipe.id,
        itemIdsToRemove
      );

      if ("error" in result && result.error) throw new Error(result.error);

      const removedItems = "removedItems" in result ? result.removedItems : 0;
      toast.success(
        removedItems > 0
          ? `${recipe.name} removed, along with ${removedItems} shopping item${
              removedItems === 1 ? "" : "s"
            }`
          : `${recipe.name} removed from the plan`
      );

      router.refresh();
    } catch (error) {
      console.error("Failed to remove recipe:", error);
      setPlanByScope((prev) => ({ ...prev, [scope]: previous }));
      toast.error("Couldn't remove the recipe. Please try again.");
    } finally {
      setRemovalRecipe(null);
      setRemovalCandidates([]);
    }
  };

  const handleCooked = async (recipe: RecipeDTO) => {
    const scope = activeView;
    const previous = planByScope[scope] ?? [];

    // Cooking removes it from the plan straight away; the toast is the safety net.
    setPlanForScope(scope, (ids) => ids.filter((id) => id !== recipe.id));

    try {
      const result = await markRecipeCookedFromClient(recipe.id);
      if ("error" in result && result.error) throw new Error(result.error);

      const previousLastCookedAt =
        "previousLastCookedAt" in result ? result.previousLastCookedAt : null;

      router.refresh();

      toast.success(`${recipe.name} marked as cooked`, {
        // Stable id so deleting the recipe can retract its now-stale undo offer.
        id: `cooked-${recipe.id}`,
        duration: 8000,
        action: {
          label: "Undo",
          onClick: async () => {
            setPlanForScope(scope, (ids) =>
              ids.includes(recipe.id) ? ids : [recipe.id, ...ids]
            );

            const undoResult = await undoRecipeCookedFromClient(
              recipe.id,
              previousLastCookedAt
            );

            if ("error" in undoResult && undoResult.error) {
              setPlanByScope((prev) => ({
                ...prev,
                [scope]: (prev[scope] ?? []).filter((id) => id !== recipe.id),
              }));
              toast.error("Couldn't undo. Please try again.");
              return;
            }

            router.refresh();
          },
        },
      });
    } catch (error) {
      console.error("Failed to mark recipe cooked:", error);
      setPlanByScope((prev) => ({ ...prev, [scope]: previous }));
      toast.error("Couldn't mark it as cooked. Please try again.");
    }
  };

  const handleClearPlan = async () => {
    const scope = activeView;
    const previous = planByScope[scope] ?? [];

    setPlanForScope(scope, () => []);

    try {
      const result = await clearMealPlanFromClient(groupId);
      if ("error" in result && result.error) throw new Error(result.error);
      router.refresh();
    } catch (error) {
      console.error("Failed to clear plan:", error);
      setPlanByScope((prev) => ({ ...prev, [scope]: previous }));
      toast.error("Couldn't clear the plan. Please try again.");
    }
  };

  const handleCreateStarters = async () => {
    setCreatingStarters(true);
    try {
      await createStarterRecipeCategoriesFromClient(groupId);
      router.refresh();
    } catch (error) {
      console.error("Failed to create starter categories:", error);
    } finally {
      setCreatingStarters(false);
    }
  };

  const handleDeleteRecipe = async () => {
    if (!deletingRecipe) return;

    const target = deletingRecipe;
    setDeletingRecipe(null);

    // A pending "cooked" undo for this recipe can no longer succeed.
    toast.dismiss(`cooked-${target.id}`);

    try {
      const result = await deleteRecipeFromClient(target.id);
      if ("error" in result && result.error) throw new Error(result.error);
      router.refresh();
    } catch (error) {
      console.error("Failed to delete recipe:", error);
      toast.error("Couldn't delete the recipe. Please try again.");
    }
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex flex-col gap-3">
        {/* Board selector */}
        <div className="flex items-center gap-2 overflow-x-auto rounded-lg bg-muted/50 p-1.5">
          <Button
            variant={activeView === "personal" ? "secondary" : "ghost"}
            size="default"
            onClick={() => setActiveView("personal")}
            className="h-11 gap-2 whitespace-nowrap"
          >
            <User className="h-4 w-4" /> Personal
          </Button>
          {userGroups.map((group) => (
            <Button
              key={group.id}
              variant={activeView === group.id ? "secondary" : "ghost"}
              size="default"
              onClick={() => setActiveView(group.id)}
              className="h-11 gap-2 whitespace-nowrap"
            >
              <Users className="h-4 w-4" /> {group.name}
            </Button>
          ))}
        </div>

        {/* Plan / Library */}
        <div className="grid grid-cols-2 gap-2 rounded-lg bg-muted/50 p-1.5">
          <Button
            variant={activeTab === "plan" ? "secondary" : "ghost"}
            onClick={() => setActiveTab("plan")}
            className="h-11 gap-2"
          >
            <ClipboardList className="h-4 w-4" />
            Plan
            {planRecipes.length > 0 && (
              <span className="rounded-full bg-primary px-2 py-0.5 text-xs text-primary-foreground">
                {planRecipes.length}
              </span>
            )}
          </Button>
          <Button
            variant={activeTab === "library" ? "secondary" : "ghost"}
            onClick={() => setActiveTab("library")}
            className="h-11 gap-2"
          >
            <LibraryBig className="h-4 w-4" />
            Library
          </Button>
        </div>

        {activeTab === "library" && (
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Search recipes..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-12 pl-10 text-base"
            />
          </div>
        )}

        <div className="flex flex-wrap items-center gap-2">
          {activeTab === "library" ? (
            <>
              <ManageRecipeCategories
                categories={currentData.categories}
                groupId={groupId}
                recipeCounts={recipeCounts}
              />
              <Button
                variant="outline"
                size="default"
                onClick={() => startTransition(() => router.refresh())}
                disabled={isPending}
                className="h-11 shrink-0"
              >
                <RefreshCw className={cn("h-4 w-4 sm:mr-2", isPending && "animate-spin")} />
                <span className="hidden sm:inline">Refresh</span>
              </Button>
              <Button
                size="default"
                className="h-11 shrink-0 shadow-sm"
                disabled={!hasCategories}
                onClick={() => {
                  setEditingRecipe(null);
                  setRecipeDialogOpen(true);
                }}
              >
                <Plus className="mr-2 h-4 w-4" />
                Add Recipe
              </Button>
            </>
          ) : (
            <>
              <Button
                variant="outline"
                size="default"
                onClick={() => startTransition(() => router.refresh())}
                disabled={isPending}
                className="h-11 shrink-0"
              >
                <RefreshCw className={cn("h-4 w-4 sm:mr-2", isPending && "animate-spin")} />
                <span className="hidden sm:inline">Refresh</span>
              </Button>
              <Button
                variant="outline"
                size="default"
                onClick={() => setShowClearPlanAlert(true)}
                disabled={planRecipes.length === 0}
                className="h-11 shrink-0 text-destructive hover:text-destructive"
              >
                <Trash2 className="h-4 w-4 sm:mr-2" />
                <span className="hidden sm:inline">Clear Plan</span>
              </Button>
            </>
          )}
        </div>

        {/* Category filter — the board already shows columns on large screens */}
        {activeTab === "library" && hasCategories && (
          <div className="flex gap-2 overflow-x-auto pb-1 lg:hidden">
            <FilterChip
              label="All"
              active={activeCategoryId === "all"}
              onClick={() => setActiveCategoryId("all")}
            />
            {currentData.categories.map((category) => (
              <FilterChip
                key={category.id}
                label={`${category.icon ? `${category.icon} ` : ""}${category.name}`}
                active={activeCategoryId === category.id}
                onClick={() => setActiveCategoryId(category.id)}
              />
            ))}
          </div>
        )}
      </div>

      {!hasCategories ? (
        <Card className="border-amber-200 bg-white/50 backdrop-blur-sm dark:border-amber-900/50 dark:bg-gray-900/50">
          <CardContent className="flex flex-col items-center gap-4 py-12 text-center">
            <Sparkles className="h-10 w-10 text-amber-500" />
            <div>
              <h3 className="text-lg font-semibold">Set up your recipe board</h3>
              <p className="mt-1 max-w-md text-sm text-muted-foreground">
                Recipes are organised into types, which become the columns of your
                board. Start with the usual four, or create your own.
              </p>
            </div>
            <div className="flex flex-wrap justify-center gap-2">
              <Button onClick={handleCreateStarters} disabled={creatingStarters} size="lg">
                {creatingStarters && <RefreshCw className="mr-2 h-4 w-4 animate-spin" />}
                Add Meat, Fish, Veg & Soups
              </Button>
              <ManageRecipeCategories
                categories={currentData.categories}
                groupId={groupId}
                recipeCounts={recipeCounts}
              />
            </div>
          </CardContent>
        </Card>
      ) : activeTab === "plan" ? (
        <PlanView
          recipes={planRecipes}
          categories={currentData.categories}
          onCooked={handleCooked}
          onRemove={(recipe) => handleTogglePlan(recipe, false)}
          onAddToList={(recipe) => setAddToListRecipe(recipe)}
          onBrowseLibrary={() => setActiveTab("library")}
        />
      ) : (
        <>
          <RecipeLibrary
            categories={currentData.categories}
            recipesByCategory={recipesByCategory}
            activeCategoryId={activeCategoryId}
            planRecipeIds={planRecipeIds}
            onTogglePlan={handleTogglePlan}
            onEdit={(recipe) => {
              setEditingRecipe(recipe);
              setRecipeDialogOpen(true);
            }}
            onDelete={(recipe) => setDeletingRecipe(recipe)}
          />

          {filteredRecipes.length === 0 && search.trim() && (
            <p className="py-4 text-center text-sm text-muted-foreground">
              No recipes match “{search}”.
            </p>
          )}
        </>
      )}

      <RecipeDialog
        open={recipeDialogOpen}
        onOpenChange={(open) => {
          setRecipeDialogOpen(open);
          if (!open) setEditingRecipe(null);
        }}
        categories={currentData.categories}
        groupId={groupId}
        recipe={editingRecipe}
        catalogItems={currentData.catalogItems}
        shoppingCategories={currentData.shoppingCategories}
        onSuccess={() => router.refresh()}
        onCatalogItemCreated={() => router.refresh()}
      />

      <AddToListDialog
        recipe={addToListRecipe}
        open={!!addToListRecipe}
        onOpenChange={(open) => !open && setAddToListRecipe(null)}
        onAdded={() => router.refresh()}
      />

      <RemoveFromPlanDialog
        recipe={removalRecipe}
        candidates={removalCandidates}
        open={!!removalRecipe}
        onOpenChange={(open) => {
          if (!open) {
            setRemovalRecipe(null);
            setRemovalCandidates([]);
          }
        }}
        onConfirm={handleConfirmRemoval}
      />

      <AlertDialog
        open={!!deletingRecipe}
        onOpenChange={(open) => !open && setDeletingRecipe(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete “{deletingRecipe?.name}”?</AlertDialogTitle>
            <AlertDialogDescription>
              This removes the recipe, its links and its ingredients. This action
              cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteRecipe}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={showClearPlanAlert} onOpenChange={setShowClearPlanAlert}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Clear the plan?</AlertDialogTitle>
            <AlertDialogDescription>
              This removes all {planRecipes.length} recipes from your{" "}
              {groupId ? "group" : "personal"} plan. The recipes themselves stay in
              your library, and nothing is marked as cooked.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                setShowClearPlanAlert(false);
                handleClearPlan();
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Clear Plan
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function FilterChip({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "whitespace-nowrap rounded-full border px-3 py-1.5 text-sm transition-colors",
        active
          ? "border-primary bg-primary text-primary-foreground"
          : "bg-background hover:bg-accent"
      )}
    >
      {label}
    </button>
  );
}
