"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { CurrencyDisplay } from "@/components/ui/currency-display";

interface Goal {
  id: string;
  name: string;
  color: string | null;
  targetAmount: string | null;
}

interface GoalProgressData {
  goal: Goal;
  currentAmount: number;
  percentage: number;
}

interface GoalProgressCardProps {
  goalsWithProgress: GoalProgressData[];
}

export function GoalProgressCard({ goalsWithProgress }: GoalProgressCardProps) {
  // Only show goals with target amounts
  const goalsWithTargets = goalsWithProgress.filter(g => g.goal.targetAmount);

  if (goalsWithTargets.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Goal Progress</CardTitle>
          <CardDescription>Track progress toward your savings goals</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground text-center py-4">
            No goals with target amounts yet. Set a target amount when creating a goal to track progress.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Goal Progress</CardTitle>
        <CardDescription>Progress toward your savings goals</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {goalsWithTargets.map((goalData) => {
            const targetAmount = parseFloat(goalData.goal.targetAmount || "0");
            const percentage = Math.min((goalData.currentAmount / targetAmount) * 100, 100);

            return (
              <div key={goalData.goal.id} className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: goalData.goal.color || "#10b981" }}
                    />
                    <span className="font-medium text-sm">{goalData.goal.name}</span>
                  </div>
                  <span className="text-sm text-muted-foreground">
                    {percentage.toFixed(0)}%
                  </span>
                </div>
                <div className="relative h-2 w-full overflow-hidden rounded-full bg-secondary">
                  <div
                    className="h-full transition-all"
                    style={{
                      width: `${percentage}%`,
                      backgroundColor: goalData.goal.color || "#10b981"
                    }}
                  />
                </div>
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span><CurrencyDisplay amount={goalData.currentAmount} /> saved</span>
                  <span><CurrencyDisplay amount={targetAmount} /> goal</span>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}