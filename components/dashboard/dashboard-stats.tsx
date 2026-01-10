import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Receipt, PiggyBank } from "lucide-react";
import { CurrencyDisplay } from "@/components/ui/currency-display";
import Link from "next/link";

interface DashboardStatsProps {
  expenses: any[];
  savingsData: any[];
  userGroups: any[];
}

export function DashboardStats({ expenses, savingsData, userGroups, userId }: DashboardStatsProps & { userId: string }) {

  // Calculate totals
  const personalExpenses = expenses.filter(e => !e.groupId);
  const personalExpensesTotal = personalExpenses.reduce((sum, e) => sum + parseFloat(e.amount), 0);

  const groupExpenseTotals = userGroups.map(group => {
    const groupExpenses = expenses.filter(e => e.groupId === group.id);
    return {
      groupId: group.id,
      groupName: group.name,
      userTotal: groupExpenses
        .filter(e => e.userId === userId)
        .reduce((sum, e) => sum + parseFloat(e.amount), 0),
      groupTotal: groupExpenses
        .reduce((sum, e) => sum + parseFloat(e.amount), 0),
    };
  });

  const totalUserExpenses = personalExpensesTotal + groupExpenseTotals.reduce((sum, g) => sum + g.userTotal, 0);
  const totalGlobalExpenses = personalExpensesTotal + groupExpenseTotals.reduce((sum, g) => sum + g.groupTotal, 0);
  
  const totalSavings = savingsData.reduce((sum, s) => sum + parseFloat(s.amount), 0);

  return (
    <div className="grid gap-4 md:grid-cols-2">
      {/* Total Expenses Card - Clickable */}
      <Link href="/dashboard/expenses">
        <Card className="bg-white/50 dark:bg-gray-900/50 backdrop-blur-sm border-pink-200 dark:border-pink-800/50 hover:shadow-lg transition-shadow cursor-pointer">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Expenses (This Month)</CardTitle>
            <Receipt className="h-5 w-5 text-pink-600 dark:text-pink-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-pink-600 dark:text-pink-400">
              <CurrencyDisplay amount={totalUserExpenses} />
              {totalGlobalExpenses !== totalUserExpenses && (
                 <span className="text-sm text-muted-foreground font-normal ml-2">
                   (<CurrencyDisplay amount={totalGlobalExpenses} />)
                 </span>
              )}
            </div>
            <div className="mt-2 space-y-1">
              <p className="text-xs text-muted-foreground">
                Personal: <CurrencyDisplay amount={personalExpensesTotal} className="font-medium" />
              </p>
              {groupExpenseTotals.map(group => (
                <p key={group.groupId} className="text-xs text-muted-foreground">
                  {group.groupName}: <CurrencyDisplay amount={group.userTotal} className="font-medium" />
                  {group.groupTotal !== group.userTotal && (
                    <span className="opacity-75"> (<CurrencyDisplay amount={group.groupTotal} />)</span>
                  )}
                </p>
              ))}
            </div>
          </CardContent>
        </Card>
      </Link>

      {/* Total Savings Card - Clickable */}
      <Link href="/dashboard/savings">
        <Card className="bg-white/50 dark:bg-gray-900/50 backdrop-blur-sm border-purple-200 dark:border-purple-800/50 hover:shadow-lg transition-shadow cursor-pointer">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Savings (This Month)</CardTitle>
            <PiggyBank className="h-5 w-5 text-purple-600 dark:text-purple-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">
              <CurrencyDisplay amount={totalSavings} />
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              {savingsData.length} {savingsData.length === 1 ? 'entry' : 'entries'} this month
            </p>
          </CardContent>
        </Card>
      </Link>
    </div>
  );
}
