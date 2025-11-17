import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Check, Zap } from "lucide-react";

interface GettingStartedCardProps {
  userGroups: any[];
  expenses: any[];
  savingsData: any[];
  categories: any[];
  goals: any[];
}

export function GettingStartedCard({ userGroups, expenses, savingsData, categories, goals }: GettingStartedCardProps) {

  // Check getting started steps completion
  const hasJoinedGroup = userGroups.length > 0;
  const hasSetupCategories = categories.length > 0 || goals.length > 0;
  const hasStartedTracking = expenses.length > 0 || savingsData.length > 0;
  const allStepsCompleted = hasJoinedGroup && hasSetupCategories && hasStartedTracking;

  if (allStepsCompleted) {
    return null;
  }

  return (
    <Card className="bg-gradient-to-br from-pink-100 to-purple-100 dark:from-pink-950/30 dark:to-purple-950/30 border-pink-200 dark:border-pink-900/30">
      <CardHeader>
        <div className="flex items-center gap-2">
          <Zap className="h-5 w-5 text-pink-600 dark:text-pink-400" />
          <CardTitle>Getting Started</CardTitle>
        </div>
        <CardDescription>Complete these steps to get the most out of Couplefy</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-start gap-3">
          <div className={`mt-0.5 rounded-full p-1 ${hasJoinedGroup ? 'bg-green-500' : 'bg-gray-300 dark:bg-gray-700'}`}>
            <Check className="h-3 w-3 text-white" />
          </div>
          <div className="flex-1">
            <p className={`text-sm font-medium ${hasJoinedGroup ? 'line-through text-muted-foreground' : ''}`}>
              Create or join a group
            </p>
            <p className="text-xs text-muted-foreground">Share expenses and savings with your partner</p>
          </div>
        </div>

        <div className="flex items-start gap-3">
          <div className={`mt-0.5 rounded-full p-1 ${hasSetupCategories ? 'bg-green-500' : 'bg-gray-300 dark:bg-gray-700'}`}>
            <Check className="h-3 w-3 text-white" />
          </div>
          <div className="flex-1">
            <p className={`text-sm font-medium ${hasSetupCategories ? 'line-through text-muted-foreground' : ''}`}>
              Set up categories or goals
            </p>
            <p className="text-xs text-muted-foreground">Organize your finances with custom categories and savings goals</p>
          </div>
        </div>

        <div className="flex items-start gap-3">
          <div className={`mt-0.5 rounded-full p-1 ${hasStartedTracking ? 'bg-green-500' : 'bg-gray-300 dark:bg-gray-700'}`}>
            <Check className="h-3 w-3 text-white" />
          </div>
          <div className="flex-1">
            <p className={`text-sm font-medium ${hasStartedTracking ? 'line-through text-muted-foreground' : ''}`}>
              Add your first expense or saving
            </p>
            <p className="text-xs text-muted-foreground">Start tracking your shared finances</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
