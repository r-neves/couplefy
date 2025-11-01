import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { getSavings } from "../actions/savings";
import { getUserCategories } from "../actions/categories";
import { getUserGroups } from "../actions/groups";
import Link from "next/link";
import { CreateSavingDialog } from "@/components/savings/create-saving-dialog";
import { CreateCategoryDialog } from "@/components/categories/create-category-dialog";
import { CategoryBreakdownChart } from "@/components/charts/category-breakdown-chart";
import { ExpenseComparisonChart } from "@/components/charts/expense-comparison-chart";
import { MonthSelector } from "@/components/filters/month-selector";
import { ThemeToggle } from "@/components/theme-toggle";

interface SavingsPageProps {
  searchParams: Promise<{ year?: string; month?: string }>;
}

export default async function SavingsPage({ searchParams }: SavingsPageProps) {
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

  const savingsResult = await getSavings({
    startDate: startOfMonth,
    endDate: endOfMonth,
  });
  const savings = savingsResult.success ? savingsResult.savings : [];

  const categoriesResult = await getUserCategories();
  const categories = categoriesResult.success
    ? categoriesResult.categories.map(c => ({
        id: c.id,
        name: c.name,
        color: c.color || "#6366f1",
        type: c.type,
      }))
    : [];

  const groupsResult = await getUserGroups();
  const groups = groupsResult.success
    ? groupsResult.groups.map(g => ({ id: g.id, name: g.name }))
    : [];

  // Calculate totals
  const personalSavings = savings.filter(s => !s.groupId);
  const sharedSavings = savings.filter(s => s.groupId);

  const personalTotal = personalSavings.reduce((sum, s) => sum + parseFloat(s.amount), 0);
  const sharedTotal = sharedSavings.reduce((sum, s) => sum + parseFloat(s.amount), 0);

  // Calculate category breakdown
  const categoryBreakdown = savings.reduce((acc, saving) => {
    const categoryId = saving.category.id;
    const categoryName = saving.category.name;
    const categoryColor = saving.category.color || "#6366f1";
    const amount = parseFloat(saving.amount);

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

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-50 via-purple-50 to-indigo-50 dark:from-gray-950 dark:via-slate-900 dark:to-gray-900">
      {/* Header */}
      <header className="border-b bg-white/90 dark:bg-gray-950/90 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-4">
              <Link href="/dashboard">
                <Button variant="outline" size="sm">← Back</Button>
              </Link>
              <h1 className="text-2xl font-bold">Savings</h1>
            </div>
            <div className="flex items-center gap-2">
              <ThemeToggle />
              <CreateCategoryDialog groups={groups} trigger={<Button variant="outline" size="sm">+ Category</Button>} />
            </div>
          </div>
          <div className="flex justify-center">
            <MonthSelector currentPath="/dashboard/savings" />
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        <div className="grid gap-6 md:grid-cols-2 mb-8">
          <Card>
            <CardHeader>
              <CardTitle>Personal Savings</CardTitle>
              <CardDescription>This month</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">${personalTotal.toFixed(2)}</div>
              <p className="text-sm text-muted-foreground mt-2">
                {personalSavings.length} transaction{personalSavings.length !== 1 ? 's' : ''}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Shared Savings</CardTitle>
              <CardDescription>This month</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">${sharedTotal.toFixed(2)}</div>
              <p className="text-sm text-muted-foreground mt-2">
                {sharedSavings.length} transaction{sharedSavings.length !== 1 ? 's' : ''}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Visualizations */}
        {savings.length > 0 && (
          <div className="grid gap-6 md:grid-cols-2 mb-8">
            <Card>
              <CardHeader>
                <CardTitle>Category Breakdown</CardTitle>
                <CardDescription>
                  Savings by category this month
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

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Recent Savings</CardTitle>
                <CardDescription>
                  All transactions for this month
                </CardDescription>
              </div>
              <CreateSavingDialog
                categories={categories}
                groups={groups}
              />
            </div>
          </CardHeader>
          <CardContent>
            {savings.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <p>No savings recorded this month</p>
                <p className="text-sm mt-2">Click "Add Saving" to get started</p>
              </div>
            ) : (
              <div className="space-y-4">
                {savings.map((saving) => (
                  <div
                    key={saving.id}
                    className="flex items-center justify-between p-4 rounded-lg border"
                  >
                    <div className="flex items-center gap-4">
                      <div
                        className="w-10 h-10 rounded-full flex items-center justify-center text-white font-semibold"
                        style={{ backgroundColor: saving.category.color || "#6366f1" }}
                      >
                        {saving.category.icon || saving.category.name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <p className="font-medium">{saving.category.name}</p>
                        {saving.description && (
                          <p className="text-sm text-muted-foreground">{saving.description}</p>
                        )}
                        <p className="text-xs text-muted-foreground mt-1">
                          {new Date(saving.date).toLocaleDateString()}
                          {saving.group && ` • ${saving.group.name}`}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-semibold text-green-600">${parseFloat(saving.amount).toFixed(2)}</p>
                      {saving.groupId && (
                        <p className="text-xs text-muted-foreground">Shared</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Setup Instructions */}
        {categories.length === 0 && (
          <Card className="mt-8">
            <CardHeader>
              <CardTitle>Get Started</CardTitle>
              <CardDescription>Set up categories to track your savings</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                You need to create saving categories before you can track your savings.
                Categories help organize your savings and make it easier to see your progress.
                Click the "+ Category" button in the header to create your first category.
              </p>
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  );
}
