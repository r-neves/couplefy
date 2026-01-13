import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { ThemeToggle } from "@/components/theme-toggle";
import { SettingsDialog } from "@/components/settings/settings-dialog";
import { getUserGroups } from "../actions/groups";
import { getShoppingListItems, getSavedItems } from "../actions/shopping-list-actions";
import { getShoppingCategories } from "../actions/shopping-categories-actions";
import { ShoppingListMain } from "@/components/shopping-list/shopping-list-main";

export default async function ShoppingListPage() {
  const { warmupPrismaConnection } = await import("@/lib/prisma");
  const warmupPromise = warmupPrismaConnection();

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect("/");

  await warmupPromise;

  const { getDbUserId } = await import("@/lib/utils/user");
  const userId = await getDbUserId(user.id);
  if (!userId) redirect("/");

  // Fetch data
  // We fetch all accessible groups
  const groupsResult = await getUserGroups(userId);
  const userGroups = groupsResult.success ? groupsResult.groups : [];
  const userGroupIds = userGroups.map(g => g.id);

  // We want to fetch ALL items user has access to (Personal + Groups) to allow client-side switching without refetching?
  // Or simpler: The action `getShoppingListItems` with no groupId fetches personal.
  // We might want to modify the action to fetch "all" if we want to dump everything to client.
  // But strictly, `getShoppingListItems` in my implementation takes a groupId or (if undefined) fetches personal.
  
  // Actually, I should probably loop and fetch or refactor action.
  // Refactoring action is better: `getAllShoppingListItems(userId)` -> returns personal items and group items the user is in.
  // But my action `getShoppingListItems` implementation: 
  // const where = groupId ? { group_id: groupId } : { user_id: userId, group_id: null };
  // It separates them.
  
  // Let's implement a wrapper or just use client component to fetch when switching tabs? 
  // Server Components should pass initial data. 
  // I will fetch Personal items + Items for each group.
  
  const [personalItemsRes, personalCategoriesRes, savedItemsRes] = await Promise.all([
    getShoppingListItems(userId),
    getShoppingCategories(userId),
    getSavedItems(userId)
  ]);

  // Convert Decimal to number for client components
  const personalItems = personalItemsRes.success
    ? personalItemsRes.items.map(item => ({
        ...item,
        quantity: item.quantity ? Number(item.quantity) : 0
      }))
    : [];
  const categories = personalCategoriesRes.success ? personalCategoriesRes.categories : [];
  const savedItems = savedItemsRes.success ? savedItemsRes.items : [];

  // For groups, we might want to fetch them too or let the client lazy load.
  // Given standard "Dashboard" feel, preloading is nice.
  
  // Let's fetch group items in parallel
  const groupDataPromises = userGroups.map(async (group) => {
    const [itemsRes, categoriesRes] = await Promise.all([
        getShoppingListItems(userId, group.id),
        getShoppingCategories(userId, group.id)
    ]);
    return {
      groupId: group.id,
      items: itemsRes.success
        ? itemsRes.items.map(item => ({
            ...item,
            quantity: item.quantity ? Number(item.quantity) : 0
          }))
        : [],
      categories: categoriesRes.success ? categoriesRes.categories : []
    };
  });

  const groupData = await Promise.all(groupDataPromises);

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-50 via-purple-50 to-indigo-50 dark:from-gray-950 dark:via-slate-900 dark:to-gray-900">
       <header className="border-b bg-white/90 dark:bg-gray-950/90 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div className="flex items-center gap-2 sm:gap-4">
              <Link href="/dashboard">
                <Button variant="outline" size="sm">← Back</Button>
              </Link>
              <h1 className="text-xl sm:text-2xl font-bold">Shopping List</h1>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              <ThemeToggle />
              <SettingsDialog />
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <ShoppingListMain 
            userId={userId}
            userGroups={userGroups}
            initialPersonalItems={personalItems}
            initialPersonalCategories={categories}
            initialGroupData={groupData}
            initialSavedItems={savedItems}
        />
      </main>
    </div>
  );
}
