import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme-toggle";
import { SettingsDialog } from "@/components/settings/settings-dialog";
import { getUserGroups } from "../actions/groups";
import { getRecipes } from "../actions/recipes-actions";
import { getRecipeCategories } from "../actions/recipe-categories-actions";
import { getMealPlanItems } from "../actions/meal-plan-actions";
import { getSavedItemsInScope } from "../actions/shopping-list-actions";
import { getShoppingCategoriesInScope } from "../actions/shopping-categories-actions";
import { MealPlanningMain } from "@/components/meal-planning/meal-planning-main";

export default async function MealPlanningPage() {
  const { warmupPrismaConnection } = await import("@/lib/prisma");
  const warmupPromise = warmupPrismaConnection();

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/");

  await warmupPromise;

  const { getDbUserId } = await import("@/lib/utils/user");
  const userId = await getDbUserId(user.id);
  if (!userId) redirect("/");

  const groupsResult = await getUserGroups(userId);
  const userGroups = groupsResult.success ? groupsResult.groups : [];

  const [
    personalRecipesRes,
    personalCategoriesRes,
    personalPlanRes,
    personalCatalogRes,
    personalShoppingCategoriesRes,
  ] = await Promise.all([
    getRecipes(userId),
    getRecipeCategories(userId),
    getMealPlanItems(userId),
    getSavedItemsInScope(userId),
    getShoppingCategoriesInScope(userId),
  ]);

  const initialPersonalData = {
    recipes: "recipes" in personalRecipesRes ? personalRecipesRes.recipes : [],
    categories:
      "categories" in personalCategoriesRes ? personalCategoriesRes.categories : [],
    planItems: "planItems" in personalPlanRes ? personalPlanRes.planItems : [],
    catalogItems:
      "catalogItems" in personalCatalogRes ? personalCatalogRes.catalogItems : [],
    shoppingCategories:
      "categories" in personalShoppingCategoriesRes
        ? personalShoppingCategoriesRes.categories
        : [],
  };

  // Preload every board so switching between personal and group is instant,
  // matching how the shopping list page behaves.
  const initialGroupData = await Promise.all(
    userGroups.map(async (group) => {
      const [recipesRes, categoriesRes, planRes, catalogRes, shoppingCategoriesRes] =
        await Promise.all([
          getRecipes(userId, group.id),
          getRecipeCategories(userId, group.id),
          getMealPlanItems(userId, group.id),
          getSavedItemsInScope(userId, group.id),
          getShoppingCategoriesInScope(userId, group.id),
        ]);

      return {
        groupId: group.id,
        recipes: "recipes" in recipesRes ? recipesRes.recipes : [],
        categories: "categories" in categoriesRes ? categoriesRes.categories : [],
        planItems: "planItems" in planRes ? planRes.planItems : [],
        catalogItems: "catalogItems" in catalogRes ? catalogRes.catalogItems : [],
        shoppingCategories:
          "categories" in shoppingCategoriesRes ? shoppingCategoriesRes.categories : [],
      };
    })
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-50 via-purple-50 to-indigo-50 dark:from-gray-950 dark:via-slate-900 dark:to-gray-900">
      <header className="border-b bg-white/90 backdrop-blur-sm dark:bg-gray-950/90">
        <div className="container mx-auto px-4 py-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2 sm:gap-4">
              <Link href="/dashboard" className="hidden md:block">
                <Button variant="outline" size="sm">
                  ← Back
                </Button>
              </Link>
              <h1 className="text-xl font-bold sm:text-2xl">Meal Planning</h1>
            </div>
            <div className="flex flex-shrink-0 items-center gap-2">
              <ThemeToggle />
              <SettingsDialog />
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 pt-8 pb-24 md:pb-8">
        <MealPlanningMain
          userGroups={userGroups}
          initialPersonalData={initialPersonalData}
          initialGroupData={initialGroupData}
        />
      </main>
    </div>
  );
}
