import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { getExpenses } from "../actions/expenses";
import { getUserCategories } from "../actions/categories";
import { getUserGroups } from "../actions/groups";
import Link from "next/link";
import { CreateExpenseDialog } from "@/components/expenses/create-expense-dialog";
import { CreateCategoryDialog } from "@/components/categories/create-category-dialog";
import { ManageCategoriesDialog } from "@/components/categories/manage-categories-dialog";
import { ExpensesList } from "@/components/expenses/expenses-list";
import { CategoryBreakdownChart } from "@/components/charts/category-breakdown-chart";
import { ExpenseComparisonChart } from "@/components/charts/expense-comparison-chart";
import { PersonBreakdownChart } from "@/components/charts/person-breakdown-chart";
import { MonthSelector } from "@/components/filters/month-selector";
import { ThemeToggle } from "@/components/theme-toggle";
import { SettingsDialog } from "@/components/settings/settings-dialog";
import { CurrencyDisplay } from "@/components/ui/currency-display";

interface ExpensesPageProps {
  searchParams: Promise<{ year?: string; month?: string }>;
}

export default async function ExpensesPage({ searchParams }: ExpensesPageProps) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect("/");
  }

  // Get month from search params or default to current month
  const params = await searchParams;
  const now = new Date();
  const isAllTime = params.year === "all";
  const year = isAllTime ? now.getFullYear() : (params.year ? parseInt(params.year) : now.getFullYear());
  const month = isAllTime ? now.getMonth() + 1 : (params.month ? parseInt(params.month) : now.getMonth() + 1);

  // Get current user's DB ID first
  const { getDbUserId } = await import("@/lib/utils/user");
  const userId = await getDbUserId(user.id);

  if (!userId) {
    redirect("/");
  }

  // Fetch user's group IDs once to avoid duplicate queries
  const { getUserGroupIds } = await import("@/lib/utils/groups");
  const userGroupIds = await getUserGroupIds(userId);

  // Run all data fetches in parallel for better performance
  const [expensesResult, categoriesResult, groupsResult] = await Promise.all([
    isAllTime
      ? getExpenses(userId, { userGroupIds })
      : getExpenses(userId, {
          startDate: new Date(year, month - 1, 1),
          endDate: new Date(year, month, 0),
          userGroupIds,
        }),
    getUserCategories(userId, undefined, userGroupIds),
    getUserGroups(userId),
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

  const groupsWithMembers = groupsResult.success ? groupsResult.groups : [];
  const groups = groupsWithMembers.map(g => ({ id: g.id, name: g.name }));

  // Calculate totals
  const personalExpenses = expenses.filter(e => !e.groupId);
  const personalTotal = personalExpenses.reduce((sum, e) => sum + parseFloat(e.amount), 0);

  // Calculate group-specific expenses
  const groupExpenseTotals = groupsWithMembers.map(group => ({
    groupId: group.id,
    groupName: group.name,
    total: expenses
      .filter(e => e.groupId === group.id)
      .reduce((sum, e) => sum + parseFloat(e.amount), 0),
    count: expenses.filter(e => e.groupId === group.id).length,
  }));

  const totalExpenses = personalTotal + groupExpenseTotals.reduce((sum, g) => sum + g.total, 0);
  const totalTransactionCount = personalExpenses.length + groupExpenseTotals.reduce((sum, g) => sum + g.count, 0);

  // Calculate category breakdown
  const categoryBreakdown = expenses.reduce((acc, expense) => {
    const categoryId = expense.category.id;
    const categoryName = expense.category.name;
    const categoryColor = expense.category.color || "#6366f1";
    const amount = parseFloat(expense.amount);

    if (!acc[categoryId]) {
      acc[categoryId] = {
        name: categoryName,
        total: 0,
        color: categoryColor,
      };
    }
    acc[categoryId].total += amount;
    return acc;
  }, {} as Record<string, { name: string; total: number; color: string }>);

  const categoryData = Object.values(categoryBreakdown);

  // Calculate group-specific analytics
  const groupAnalytics = groupsWithMembers.map(group => {
    const groupExpenses = expenses.filter(e => e.groupId === group.id);

    // Category breakdown for this group
    const groupCategoryBreakdown = groupExpenses.reduce((acc, expense) => {
      const categoryId = expense.category.id;
      const categoryName = expense.category.name;
      const categoryColor = expense.category.color || "#6366f1";
      const amount = parseFloat(expense.amount);

      if (!acc[categoryId]) {
        acc[categoryId] = {
          name: categoryName,
          total: 0,
          color: categoryColor,
        };
      }
      acc[categoryId].total += amount;
      return acc;
    }, {} as Record<string, { name: string; total: number; color: string }>);

    // Per-person spending for this group
    const personSpending = groupExpenses.reduce((acc, expense) => {
      const userId = expense.user.id;
      const userName = expense.user.name;
      const amount = parseFloat(expense.amount);

      if (!acc[userId]) {
        acc[userId] = {
          name: userName,
          total: 0,
        };
      }
      acc[userId].total += amount;
      return acc;
    }, {} as Record<string, { name: string; total: number }>);

    return {
      group,
      categoryData: Object.values(groupCategoryBreakdown),
      personData: Object.values(personSpending),
      totalExpenses: groupExpenses.length,
      totalAmount: groupExpenses.reduce((sum, e) => sum + parseFloat(e.amount), 0),
    };
  });

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-50 via-purple-50 to-indigo-50 dark:from-gray-950 dark:via-slate-900 dark:to-gray-900">
      {/* Header */}
      <header className="border-b bg-white/90 dark:bg-gray-950/90 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between mb-4 gap-2 flex-wrap">
            <div className="flex items-center gap-2 sm:gap-4">
              <Link href="/dashboard">
                <Button variant="outline" size="sm">← Back</Button>
              </Link>
              <h1 className="text-xl sm:text-2xl font-bold">Expenses</h1>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              <ThemeToggle />
              <SettingsDialog />
              <ManageCategoriesDialog categories={categories} groups={groups} trigger={<Button variant="outline" size="sm" className="hidden sm:inline-flex">Manage</Button>} />
              <CreateCategoryDialog groups={groups} trigger={<Button variant="outline" size="sm" className="hidden sm:inline-flex">+ Category</Button>} />
              <CreateCategoryDialog groups={groups} trigger={<Button variant="outline" size="sm" className="sm:hidden">+</Button>} />
            </div>
          </div>
          <div className="flex justify-center">
            <MonthSelector currentPath="/dashboard/expenses" />
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Expenses Overview</CardTitle>
            <CardDescription>This month</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Personal</span>
                <div className="text-right">
                  <div className="font-semibold"><CurrencyDisplay amount={personalTotal} /></div>
                  <div className="text-xs text-muted-foreground">
                    {personalExpenses.length} transaction{personalExpenses.length !== 1 ? 's' : ''}
                  </div>
                </div>
              </div>
              {groupExpenseTotals.map(group => (
                <div key={group.groupId} className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">{group.groupName}</span>
                  <div className="text-right">
                    <div className="font-semibold"><CurrencyDisplay amount={group.total} /></div>
                    <div className="text-xs text-muted-foreground">
                      {group.count} transaction{group.count !== 1 ? 's' : ''}
                    </div>
                  </div>
                </div>
              ))}
              <div className="pt-3 border-t flex justify-between items-center">
                <span className="font-medium">Total</span>
                <div className="text-right">
                  <div className="text-2xl font-bold"><CurrencyDisplay amount={totalExpenses} /></div>
                  <div className="text-sm text-muted-foreground">
                    {totalTransactionCount} transaction{totalTransactionCount !== 1 ? 's' : ''}
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Visualizations */}
        {expenses.length > 0 && (
          <div className="grid gap-6 md:grid-cols-2 mb-8">
            <Card>
              <CardHeader>
                <CardTitle>Category Breakdown</CardTitle>
                <CardDescription>
                  Spending by category this month
                </CardDescription>
              </CardHeader>
              <CardContent>
                <CategoryBreakdownChart data={categoryData} />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Expense Distribution</CardTitle>
                <CardDescription>
                  Personal and group expenses
                </CardDescription>
              </CardHeader>
              <CardContent>
                <CategoryBreakdownChart 
                  data={[
                    { name: "Personal", total: personalTotal, color: "#6366f1" },
                    ...groupExpenseTotals.map((g, i) => ({
                      name: g.groupName,
                      total: g.total,
                      color: ["#ec4899", "#8b5cf6", "#10b981", "#f59e0b"][i % 4],
                    })),
                  ].filter(d => d.total > 0)}
                />
              </CardContent>
            </Card>
          </div>
        )}

        {/* Group-specific Analytics */}
        {groupAnalytics.map(analytics => (
          analytics.totalExpenses > 0 && (
            <div key={analytics.group.id} className="mb-8">
              <h2 className="text-xl font-semibold mb-4">{analytics.group.name} - Group Expenses</h2>
              <div className="grid gap-6 md:grid-cols-2 mb-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Category Breakdown</CardTitle>
                    <CardDescription>
                      Spending by category for {analytics.group.name}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <CategoryBreakdownChart data={analytics.categoryData} />
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Spending by Person</CardTitle>
                    <CardDescription>
                      How much each person spent in {analytics.group.name}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <PersonBreakdownChart data={analytics.personData} />
                  </CardContent>
                </Card>
              </div>
            </div>
          )
        ))}

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Expenses List</CardTitle>
                <CardDescription>
                  {isAllTime ? "All transactions" : "All transactions for this month"}
                </CardDescription>
              </div>
              <CreateExpenseDialog
                categories={categories}
                groups={groups}
                groupsWithMembers={groupsWithMembers}
                currentUserId={userId}
              />
            </div>
          </CardHeader>
          <CardContent>
            <ExpensesList
              expenses={expenses}
              categories={categories}
              groups={groups}
              groupsWithMembers={groupsWithMembers}
              currentUserId={userId}
            />
          </CardContent>
        </Card>

        {/* Setup Instructions */}
        {categories.length === 0 && (
          <Card className="mt-8">
            <CardHeader>
              <CardTitle>Get Started</CardTitle>
              <CardDescription>Set up categories to track your expenses</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                You need to create expense categories before you can track your spending.
                Categories help organize your expenses and make it easier to see where your money goes.
                Click the "+ Category" button in the header to create your first category.
              </p>
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  );
}
