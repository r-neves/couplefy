import { DashboardStats } from "./dashboard-stats";
import { QuickActions } from "./quick-actions";
import { GettingStartedCard } from "./getting-started-card";
import { getExpenses } from "@/app/dashboard/actions/expenses";
import { getSavings } from "@/app/dashboard/actions/savings";
import { getUserCategories } from "@/app/dashboard/actions/categories";
import { getUserGoals } from "@/app/dashboard/actions/goals";

interface DashboardDataProps {
  userId: string;
  currentUserId: string;
  startOfMonth: Date;
  endOfMonth: Date;
  userGroupIds: string[];
  userGroups: any[];
}

export async function DashboardData({
  userId,
  currentUserId,
  startOfMonth,
  endOfMonth,
  userGroupIds,
  userGroups,
}: DashboardDataProps) {
  // Fetch all data in parallel - this happens only once
  const [expensesResult, savingsResult, categoriesResult, goalsResult] = await Promise.all([
    getExpenses(userId, { startDate: startOfMonth, endDate: endOfMonth, userGroupIds }),
    getSavings(userId, { startDate: startOfMonth, endDate: endOfMonth, userGroupIds }),
    getUserCategories(userId, undefined, userGroupIds),
    getUserGoals(userId, userGroupIds),
  ]);

  const expenses = expensesResult.success ? expensesResult.expenses : [];
  const savingsData = savingsResult.success ? savingsResult.savings : [];
  const categories = categoriesResult.success ? categoriesResult.categories : [];
  const goals = goalsResult.success ? goalsResult.goals : [];

  return (
    <>
      {/* Quick Actions */}
      <div className="mb-8">
        <QuickActions
          categories={categories}
          goals={goals}
          groups={userGroups}
          groupsWithMembers={userGroups}
          currentUserId={currentUserId}
        />
      </div>

      {/* Stats Cards */}
      <div className="mb-8">
        <DashboardStats
          expenses={expenses}
          savingsData={savingsData}
          userGroups={userGroups}
        />
      </div>

      {/* Getting Started Card */}
      <div className="mb-8">
        <GettingStartedCard
          userGroups={userGroups}
          expenses={expenses}
          savingsData={savingsData}
          categories={categories}
          goals={goals}
        />
      </div>
    </>
  );
}
