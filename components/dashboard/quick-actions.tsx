import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Zap } from "lucide-react";
import { CreateExpenseDialog } from "@/components/expenses/create-expense-dialog";
import { CreateSavingDialog } from "@/components/savings/create-saving-dialog";

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
      </CardContent>
    </Card>
  );
}
