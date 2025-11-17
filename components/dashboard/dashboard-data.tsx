import { DashboardStats } from "./dashboard-stats";
import { QuickActions } from "./quick-actions";
import { GettingStartedCard } from "./getting-started-card";
import { GroupsManagement } from "./groups-management";
import { getExpenses } from "@/app/dashboard/actions/expenses";
import { getSavings } from "@/app/dashboard/actions/savings";
import { getUserCategories } from "@/app/dashboard/actions/categories";
import { getUserGoals } from "@/app/dashboard/actions/goals";
import { getUserGroups } from "@/app/dashboard/actions/groups";

interface DashboardDataProps {
  userId: string;
  currentUserId: string;
  startOfMonth: Date;
  endOfMonth: Date;
}

export async function DashboardData({
  userId,
  currentUserId,
  startOfMonth,
  endOfMonth,
}: DashboardDataProps) {
  // Fetch all data in parallel - this happens only once
  const [groupsResult, expensesResult, savingsResult, categoriesResult, goalsResult] = await Promise.all([
    getUserGroups(userId),
    getExpenses(userId, { startDate: startOfMonth, endDate: endOfMonth }),
    getSavings(userId, { startDate: startOfMonth, endDate: endOfMonth }),
    getUserCategories(userId),
    getUserGoals(userId),
  ]);

  const userGroups = groupsResult.success ? groupsResult.groups : [];
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

      {/* Groups Management */}
      <GroupsManagement userGroups={userGroups} />
    </>
  );
}
