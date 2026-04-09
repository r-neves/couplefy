import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { getExpenses } from "../../actions/expenses";
import { getUserCategories } from "../../actions/categories";
import { getUserGroups } from "../../actions/groups";
import Link from "next/link";
import { MonthSelector } from "@/components/filters/month-selector";
import { ThemeToggle } from "@/components/theme-toggle";
import { SettingsDialog } from "@/components/settings/settings-dialog";
import { ExpensesFilter } from "@/components/expenses/expenses-filter";

interface AllExpensesPageProps {
  searchParams: Promise<{ year?: string; month?: string }>;
}

export default async function AllExpensesPage({ searchParams }: AllExpensesPageProps) {
  const { warmupPrismaConnection } = await import("@/lib/prisma");
  const warmupPromise = warmupPrismaConnection();

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect("/");
  }

  const params = await searchParams;
  const now = new Date();
  const isAllTime = params.year === "all";
  const year = isAllTime ? now.getFullYear() : (params.year ? parseInt(params.year) : now.getFullYear());
  const month = isAllTime ? now.getMonth() + 1 : (params.month ? parseInt(params.month) : now.getMonth() + 1);

  await warmupPromise;

  const { getDbUserId } = await import("@/lib/utils/user");
  const userId = await getDbUserId(user.id);

  if (!userId) {
    redirect("/");
  }

  const groupsResult = await getUserGroups(userId);
  const groupsWithMembers = groupsResult.success ? groupsResult.groups : [];
  const userGroupIds = groupsWithMembers.map(g => g.id);
  const groups = groupsWithMembers.map(g => ({ id: g.id, name: g.name }));

  const [expensesResult, categoriesResult] = await Promise.all([
    isAllTime
      ? getExpenses(userId, { userGroupIds })
      : getExpenses(userId, {
          startDate: new Date(year, month - 1, 1),
          endDate: new Date(year, month, 0),
          userGroupIds,
        }),
    getUserCategories(userId, undefined, userGroupIds),
  ]);

  const expenses = expensesResult.success ? expensesResult.expenses : [];
  const categories = categoriesResult.success
    ? categoriesResult.categories.map(c => ({
        id: c.id,
        name: c.name,
        color: c.color || "#6366f1",
        groupId: c.groupId,
      }))
    : [];

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-50 via-purple-50 to-indigo-50 dark:from-gray-950 dark:via-slate-900 dark:to-gray-900">
      <header className="border-b bg-white/90 dark:bg-gray-950/90 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between mb-4 gap-2 flex-wrap">
            <div className="flex items-center gap-2 sm:gap-4">
              <Link href="/dashboard/expenses">
                <Button variant="outline" size="sm">← Back</Button>
              </Link>
              <h1 className="text-xl sm:text-2xl font-bold">All Expenses</h1>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              <ThemeToggle />
              <SettingsDialog />
            </div>
          </div>
          <div className="flex justify-center">
            <MonthSelector currentPath="/dashboard/expenses/all" />
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <Card className="bg-white/50 dark:bg-gray-900/50 backdrop-blur-sm border-pink-200 dark:border-pink-800/50">
          <CardHeader>
            <CardTitle className="text-pink-900 dark:text-pink-100">Expenses</CardTitle>
            <CardDescription>
              {isAllTime ? "All transactions" : "All transactions for this month"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ExpensesFilter
              expenses={expenses}
              categories={categories}
              groups={groups}
              groupsWithMembers={groupsWithMembers}
              currentUserId={userId}
            />
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
