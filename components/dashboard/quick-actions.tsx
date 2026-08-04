import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Zap, ShoppingCart, UtensilsCrossed } from "lucide-react";
import { CreateExpenseDialog } from "@/components/expenses/create-expense-dialog";
import { CreateSavingDialog } from "@/components/savings/create-saving-dialog";
import Link from "next/link";
import { Button } from "@/components/ui/button";

interface QuickActionsProps {
  categories: any[];
  goals: any[];
  groups: any[];
  groupsWithMembers: any[];
  currentUserId: string;
}

export function QuickActions({ categories, goals, groups, groupsWithMembers, currentUserId }: QuickActionsProps) {

  return (
    <Card className="bg-white/50 dark:bg-gray-900/50 backdrop-blur-sm">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Zap className="h-5 w-5 text-amber-500" />
          Quick Actions
        </CardTitle>
        <CardDescription>Common tasks you can do right now</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <CreateExpenseDialog
          categories={categories as any}
          groups={groups}
          groupsWithMembers={groupsWithMembers}
          currentUserId={currentUserId}
        />

        <CreateSavingDialog
          goals={goals as any}
          groups={groups}
          groupsWithMembers={groupsWithMembers}
          currentUserId={currentUserId}
        />

        <Link href="/dashboard/shopping-list" className="block">
          <Button
            className="w-full justify-start gap-3 h-auto py-4 px-4 bg-gradient-to-br from-green-50 to-green-100 dark:from-green-950/30 dark:to-green-900/30 border-green-200 dark:border-green-900/30 hover:shadow-md hover:from-green-100 hover:to-green-200 dark:hover:from-green-900/40 dark:hover:to-green-800/40 transition-all"
            variant="outline"
          >
            <ShoppingCart className="h-6 w-6 flex-shrink-0 text-green-600 dark:text-green-400" />
            <div className="text-left">
              <div className="font-semibold text-sm text-green-900 dark:text-green-100">Shopping List</div>
              <div className="text-xs text-green-700 dark:text-green-300">Manage your shopping items</div>
            </div>
          </Button>
        </Link>

        <Link href="/dashboard/meal-planning" className="block">
          <Button
            className="w-full justify-start gap-3 h-auto py-4 px-4 bg-gradient-to-br from-amber-50 to-amber-100 dark:from-amber-950/30 dark:to-amber-900/30 border-amber-200 dark:border-amber-900/30 hover:shadow-md hover:from-amber-100 hover:to-amber-200 dark:hover:from-amber-900/40 dark:hover:to-amber-800/40 transition-all"
            variant="outline"
          >
            <UtensilsCrossed className="h-6 w-6 flex-shrink-0 text-amber-600 dark:text-amber-400" />
            <div className="text-left">
              <div className="font-semibold text-sm text-amber-900 dark:text-amber-100">Meal Planning</div>
              <div className="text-xs text-amber-700 dark:text-amber-300">Plan meals from your recipes</div>
            </div>
          </Button>
        </Link>
      </CardContent>
    </Card>
  );
}
