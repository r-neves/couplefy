import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { getSavings } from "../actions/savings";
import { getUserGoals } from "../actions/goals";
import { getUserGroups } from "../actions/groups";
import Link from "next/link";
import { CreateSavingDialog } from "@/components/savings/create-saving-dialog";
import { CreateGoalDialog } from "@/components/goals/create-goal-dialog";
import { ManageGoalsDialog } from "@/components/goals/manage-goals-dialog";
import { SavingsList } from "@/components/savings/savings-list";
import { CategoryBreakdownChart } from "@/components/charts/category-breakdown-chart";
import { GoalProgressCard } from "@/components/goals/goal-progress-card";
import { MonthSelector } from "@/components/filters/month-selector";
import { ThemeToggle } from "@/components/theme-toggle";
import { SettingsDialog } from "@/components/settings/settings-dialog";
import { CurrencyDisplay } from "@/components/ui/currency-display";

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
  const isAllTime = params.year === "all";
  const year = isAllTime ? now.getFullYear() : (params.year ? parseInt(params.year) : now.getFullYear());
  const month = isAllTime ? now.getMonth() + 1 : (params.month ? parseInt(params.month) : now.getMonth() + 1);

  // Get current user's DB ID first
  const { getDbUserId } = await import("@/lib/utils/user");
  const userId = await getDbUserId(user.id);

  if (!userId) {
    redirect("/");
  }

  // Fetch user's groups first to extract IDs for other queries
  const groupsResult = await getUserGroups(userId);
  const userGroups = groupsResult.success ? groupsResult.groups : [];
  const userGroupIds = userGroups.map(g => g.id);

  // Run all other data fetches in parallel for better performance
  const [savingsResult, goalsResult] = await Promise.all([
    isAllTime
      ? getSavings(userId, { userGroupIds })
      : getSavings(userId, {
          startDate: new Date(year, month - 1, 1),
          endDate: new Date(year, month, 0),
          userGroupIds,
        }),
    getUserGoals(userId, userGroupIds),
  ]);

  const savings = savingsResult.success ? savingsResult.savings : [];
  const goals = goalsResult.success
    ? goalsResult.goals.map(g => ({
        id: g.id,
        name: g.name,
        color: g.color || "#10b981",
        targetAmount: g.targetAmount,
        groupId: g.groupId,
      }))
    : [];

  const groupsWithMembers = groupsResult.success ? groupsResult.groups : [];
  const groups = groupsWithMembers.map(g => ({ id: g.id, name: g.name }));

  // Calculate total savings this month
  const totalSavings = savings.reduce((sum, s) => sum + parseFloat(s.amount), 0);

  // Calculate goal breakdown with progress
  const goalBreakdown = savings.reduce((acc, saving) => {
    const goalId = saving.goal.id;
    const goalName = saving.goal.name;
    const goalColor = saving.goal.color || "#10b981";
    const amount = parseFloat(saving.amount);

    if (!acc[goalId]) {
      acc[goalId] = {
        name: goalName,
        total: 0,
        color: goalColor,
      };
    }
    acc[goalId].total += amount;
    return acc;
  }, {} as Record<string, { name: string; total: number; color: string }>);

  const goalData = Object.values(goalBreakdown);

  // Calculate goal progress (all time, not just this month)
  const allTimeSavingsResult = await getSavings(userId, {});
  const allTimeSavings = allTimeSavingsResult.success ? allTimeSavingsResult.savings : [];

  const goalProgress = goals.map(goal => {
    const currentAmount = allTimeSavings
      .filter(s => s.goalId === goal.id)
      .reduce((sum, s) => sum + parseFloat(s.amount), 0);

    const targetAmount = parseFloat(goal.targetAmount || "0");
    const percentage = targetAmount > 0 ? (currentAmount / targetAmount) * 100 : 0;

    return {
      goal,
      currentAmount,
      percentage,
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
              <h1 className="text-xl sm:text-2xl font-bold">Savings</h1>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              <ThemeToggle />
              <SettingsDialog />
              <ManageGoalsDialog goals={goals} groups={groups} trigger={<Button variant="outline" size="sm" className="hidden sm:inline-flex">Manage</Button>} />
              <CreateGoalDialog groups={groups} trigger={<Button variant="outline" size="sm" className="hidden sm:inline-flex">+ Goal</Button>} />
              <CreateGoalDialog groups={groups} trigger={<Button variant="outline" size="sm" className="sm:hidden">+</Button>} />
            </div>
          </div>
          <div className="flex justify-center">
            <MonthSelector currentPath="/dashboard/savings" />
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        {/* Total and Progress */}
        <div className="grid gap-6 md:grid-cols-2 mb-8">
          <Card className="bg-white/50 dark:bg-gray-900/50 backdrop-blur-sm border-purple-200 dark:border-purple-800/50">
            <CardHeader>
              <CardTitle className="text-purple-900 dark:text-purple-100">Total Saved This Month</CardTitle>
              <CardDescription>All goals combined</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-purple-600 dark:text-purple-400"><CurrencyDisplay amount={totalSavings} /></div>
              <p className="text-sm text-muted-foreground mt-2">
                {savings.length} transaction{savings.length !== 1 ? 's' : ''}
              </p>
            </CardContent>
          </Card>

          <GoalProgressCard goalsWithProgress={goalProgress} />
        </div>

        {/* Visualizations */}
        {savings.length > 0 && (
          <div className="mb-8">
            <Card className="bg-white/50 dark:bg-gray-900/50 backdrop-blur-sm border-purple-200 dark:border-purple-800/50">
              <CardHeader>
                <CardTitle className="text-purple-900 dark:text-purple-100">Savings by Goal</CardTitle>
                <CardDescription>
                  Breakdown for this month
                </CardDescription>
              </CardHeader>
              <CardContent>
                <CategoryBreakdownChart data={goalData} />
              </CardContent>
            </Card>
          </div>
        )}

        <Card className="bg-white/50 dark:bg-gray-900/50 backdrop-blur-sm border-purple-200 dark:border-purple-800/50">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-purple-900 dark:text-purple-100">Recent Savings</CardTitle>
                <CardDescription>
                  {isAllTime ? "All transactions" : "All transactions for this month"}
                </CardDescription>
              </div>
              <CreateSavingDialog
                goals={goals}
                groups={groups}
                groupsWithMembers={groupsWithMembers}
                currentUserId={userId}
                simple
              />
            </div>
          </CardHeader>
          <CardContent>
            <SavingsList
              savings={savings}
              goals={goals}
              groups={groups}
              groupsWithMembers={groupsWithMembers}
              currentUserId={userId}
            />
          </CardContent>
        </Card>

        {/* Setup Instructions */}
        {goals.length === 0 && (
          <Card className="mt-8 bg-white/50 dark:bg-gray-900/50 backdrop-blur-sm border-purple-200 dark:border-purple-800/50">
            <CardHeader>
              <CardTitle className="text-purple-900 dark:text-purple-100">Get Started</CardTitle>
              <CardDescription>Set up goals to track your savings</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                You need to create savings goals before you can track your savings.
                Goals help you organize your savings and track progress toward targets.
                Click the "+ Goal" button in the header to create your first goal.
              </p>
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  );
}