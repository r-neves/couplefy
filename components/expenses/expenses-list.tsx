"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { EditExpenseDialog } from "./edit-expense-dialog";
import { DeleteExpenseDialog } from "./delete-expense-dialog";
import { Pencil, Trash2 } from "lucide-react";
import { CurrencyDisplay } from "@/components/ui/currency-display";

interface Category {
  id: string;
  name: string;
  color: string | null;
  icon?: string | null;
}

interface Group {
  id: string;
  name: string;
}

interface GroupWithMembers {
  id: string;
  name: string;
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
  members: Array<{
    user: {
      id: string;
      name: string;
    };
  }>;
}

interface User {
  id: string;
  name: string;
}

interface Expense {
  id: string;
  amount: string;
  categoryId: string;
  description: string | null;
  date: Date;
  groupId: string | null;
  userId: string;
  category: Category;
  group: Group | null;
  user: User;
}

interface ExpensesListProps {
  expenses: Expense[];
  categories: Array<{
    id: string;
    name: string;
    color: string;
    groupId: string | null;
  }>;
  groups: Array<{
    id: string;
    name: string;
  }>;
  groupsWithMembers: GroupWithMembers[];
  currentUserId: string;
}

export function ExpensesList({
  expenses,
  categories,
  groups,
  groupsWithMembers,
  currentUserId,
}: ExpensesListProps) {
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [deletingExpense, setDeletingExpense] = useState<Expense | null>(null);

  return (
    <>
      {expenses.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          <p>No expenses recorded this month</p>
          <p className="text-sm mt-2">Click "Add Expense" to get started</p>
        </div>
      ) : (
        <div className="space-y-4">
          {expenses.map((expense) => (
            <div
              key={expense.id}
              className="flex items-start gap-2 sm:gap-4 p-3 sm:p-4 rounded-lg border"
            >
              <div className="flex items-center gap-2 sm:gap-4 flex-1 min-w-0">
                <div
                  className="w-8 h-8 sm:w-10 sm:h-10 rounded-full flex items-center justify-center text-white font-semibold text-sm flex-shrink-0"
                  style={{ backgroundColor: expense.category.color || "#6366f1" }}
                >
                  {expense.category.icon || expense.category.name.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm sm:text-base truncate">{expense.category.name}</p>
                  {expense.description && (
                    <p className="text-xs sm:text-sm text-muted-foreground truncate">{expense.description}</p>
                  )}
                  <p className="text-xs text-muted-foreground mt-1">
                    {new Date(expense.date).toLocaleDateString()}
                    {expense.group && ` • ${expense.group.name}`}
                    {!expense.group && ` • Personal`}
                    {expense.group && expense.user && ` • ${expense.user.name}`}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-1 flex-shrink-0">
                <div className="text-right">
                  <p className="text-base sm:text-lg font-semibold whitespace-nowrap">
                    <CurrencyDisplay amount={parseFloat(expense.amount)} />
                  </p>
                  {expense.groupId && (
                    <p className="text-xs text-muted-foreground">Shared</p>
                  )}
                </div>
                <div className="flex flex-col sm:flex-row gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => setEditingExpense(expense)}
                  >
                    <Pencil className="h-3 w-3 sm:h-4 sm:w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => setDeletingExpense(expense)}
                  >
                    <Trash2 className="h-3 w-3 sm:h-4 sm:w-4 text-destructive" />
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {editingExpense && (
        <EditExpenseDialog
          expense={editingExpense}
          categories={categories}
          groups={groups}
          groupsWithMembers={groupsWithMembers}
          currentUserId={currentUserId}
          open={!!editingExpense}
          onOpenChange={(open) => !open && setEditingExpense(null)}
        />
      )}

      {deletingExpense && (
        <DeleteExpenseDialog
          expenseId={deletingExpense.id}
          expenseDescription={deletingExpense.description || deletingExpense.category.name}
          open={!!deletingExpense}
          onOpenChange={(open) => !open && setDeletingExpense(null)}
        />
      )}
    </>
  );
}
