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
import { ExpensesList } from "@/components/expenses/expenses-list";
import { CategoryBreakdownChart } from "@/components/charts/category-breakdown-chart";
import { ExpenseComparisonChart } from "@/components/charts/expense-comparison-chart";
import { PersonBreakdownChart } from "@/components/charts/person-breakdown-chart";
import { MonthSelector } from "@/components/filters/month-selector";
import { ThemeToggle } from "@/components/theme-toggle";

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
  const year = params.year ? parseInt(params.year) : now.getFullYear();
  const month = params.month ? parseInt(params.month) : now.getMonth() + 1;

  const startOfMonth = new Date(year, month - 1, 1);
  const endOfMonth = new Date(year, month, 0);

  const expensesResult = await getExpenses({
    startDate: startOfMonth,
    endDate: endOfMonth,
  });
  const expenses = expensesResult.success ? expensesResult.expenses : [];

  const categoriesResult = await getUserCategories();
  const categories = categoriesResult.success
    ? categoriesResult.categories.map(c => ({
        id: c.id,
        name: c.name,
        color: c.color || "#6366f1",
        type: c.type,
        groupId: c.groupId,
      }))
    : [];

  const groupsResult = await getUserGroups();
  const groupsWithMembers = groupsResult.success ? groupsResult.groups : [];
  const groups = groupsWithMembers.map(g => ({ id: g.id, name: g.name }));

  // Get current user's DB ID
  const { db } = await import("@/lib/db");
  const { users: usersSchema } = await import("@/lib/db/schema");
  const { eq } = await import("drizzle-orm");
  const currentUser = await db.query.users.findFirst({
    where: eq(usersSchema.supabaseId, user.id),
  });

  // Calculate totals
  const personalExpenses = expenses.filter(e => !e.groupId);
  const sharedExpenses = expenses.filter(e => e.groupId);

  const personalTotal = personalExpenses.reduce((sum, e) => sum + parseFloat(e.amount), 0);
  const sharedTotal = sharedExpenses.reduce((sum, e) => sum + parseFloat(e.amount), 0);

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
        <div className="grid gap-6 md:grid-cols-2 mb-8">
          <Card>
            <CardHeader>
              <CardTitle>Personal Expenses</CardTitle>
              <CardDescription>This month</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">${personalTotal.toFixed(2)}</div>
              <p className="text-sm text-muted-foreground mt-2">
                {personalExpenses.length} transaction{personalExpenses.length !== 1 ? 's' : ''}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Shared Expenses</CardTitle>
              <CardDescription>This month</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">${sharedTotal.toFixed(2)}</div>
              <p className="text-sm text-muted-foreground mt-2">
                {sharedExpenses.length} transaction{sharedExpenses.length !== 1 ? 's' : ''}
              </p>
            </CardContent>
          </Card>
        </div>

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
                <CardTitle>Personal vs Shared</CardTitle>
                <CardDescription>
                  Comparison for this month
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ExpenseComparisonChart
                  personalTotal={personalTotal}
                  sharedTotal={sharedTotal}
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
                  All transactions for this month
                </CardDescription>
              </div>
              <CreateExpenseDialog
                categories={categories}
                groups={groups}
                groupsWithMembers={groupsWithMembers}
                currentUserId={currentUser?.id || ""}
              />
            </div>
          </CardHeader>
          <CardContent>
            <ExpensesList
              expenses={expenses}
              categories={categories}
              groups={groups}
              groupsWithMembers={groupsWithMembers}
              currentUserId={currentUser?.id || ""}
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
