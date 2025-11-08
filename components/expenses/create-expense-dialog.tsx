"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { createExpense } from "@/app/dashboard/actions/expenses";
import { useRouter } from "next/navigation";

interface Category {
  id: string;
  name: string;
  color: string;
  type: string;
  groupId: string | null;
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

interface CreateExpenseDialogProps {
  categories: Category[];
  groups: Group[];
  groupsWithMembers: GroupWithMembers[];
  currentUserId: string;
  trigger?: React.ReactNode;
}

export function CreateExpenseDialog({ categories, groups, groupsWithMembers, currentUserId, trigger }: CreateExpenseDialogProps) {
  const [open, setOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [groupId, setGroupId] = useState("");
  const [paidById, setPaidById] = useState(currentUserId);
  const router = useRouter();

  // Filter categories based on type (expense/both) and selected group
  const expenseCategories = categories.filter(c => {
    const isExpenseType = c.type === "expense" || c.type === "both";
    if (!isExpenseType) return false;

    // If personal is selected, show only personal categories (no groupId)
    if (!groupId) {
      return c.groupId === null;
    }

    // If a group is selected, show only categories for that group
    return c.groupId === groupId;
  });

  // Reset paidById when currentUserId changes
  useEffect(() => {
    setPaidById(currentUserId);
  }, [currentUserId]);

  // Reset paidById and categoryId when group changes
  useEffect(() => {
    setPaidById(currentUserId);
    setCategoryId(""); // Reset category when type changes
  }, [groupId, currentUserId]);

  // Get the selected group's members
  const selectedGroup = groupsWithMembers.find(g => g.id === groupId);
  const groupMembers = selectedGroup?.members || [];

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setIsLoading(true);
    setError("");

    const formData = new FormData(e.currentTarget);
    formData.append("categoryId", categoryId);
    if (groupId) {
      formData.append("groupId", groupId);
      formData.append("paidById", paidById);
    }

    const result = await createExpense(formData);

    if (result.error) {
      setError(result.error);
      setIsLoading(false);
    } else {
      setOpen(false);
      setIsLoading(false);
      setCategoryId("");
      setGroupId("");
      setPaidById(currentUserId);
      (e.target as HTMLFormElement).reset();
      router.refresh();
    }
  }

  // Default date to today
  const today = new Date().toISOString().split('T')[0];

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || <Button>Add Expense</Button>}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Add Expense</DialogTitle>
            <DialogDescription>
              Record a new expense transaction
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="type">Type</Label>
              <Select value={groupId || "personal"} onValueChange={(value) => setGroupId(value === "personal" ? "" : value)} disabled={isLoading}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="personal">Personal</SelectItem>
                  {groups.map((group) => (
                    <SelectItem key={group.id} value={group.id}>
                      {group.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                {groupId ? "Shared with your couple" : "Personal expense"}
              </p>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="category">Category</Label>
              <Select value={categoryId} onValueChange={setCategoryId} disabled={isLoading} required>
                <SelectTrigger>
                  <SelectValue placeholder="Select a category" />
                </SelectTrigger>
                <SelectContent>
                  {expenseCategories.length === 0 ? (
                    <div className="p-2 text-sm text-muted-foreground">
                      No categories available for this type. Create one first.
                    </div>
                  ) : (
                    expenseCategories.map((category) => (
                      <SelectItem key={category.id} value={category.id}>
                        <div className="flex items-center gap-2">
                          <div
                            className="w-3 h-3 rounded-full"
                            style={{ backgroundColor: category.color }}
                          />
                          {category.name}
                        </div>
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="amount">Amount</Label>
              <Input
                id="amount"
                name="amount"
                type="number"
                step="0.01"
                min="0"
                placeholder="0.00"
                required
                disabled={isLoading}
              />
            </div>

            {groupId && groupMembers.length > 0 && (
              <div className="grid gap-2">
                <Label htmlFor="paidBy">Paid by</Label>
                <Select value={paidById} onValueChange={setPaidById} disabled={isLoading}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select who paid" />
                  </SelectTrigger>
                  <SelectContent>
                    {groupMembers.map((member) => (
                      <SelectItem key={member.user.id} value={member.user.id}>
                        {member.user.name}
                        {member.user.id === currentUserId && " (You)"}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="grid gap-2">
              <Label htmlFor="date">Date</Label>
              <Input
                id="date"
                name="date"
                type="date"
                defaultValue={today}
                required
                disabled={isLoading}
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="description">Description (Optional)</Label>
              <Textarea
                id="description"
                name="description"
                placeholder="Add a note about this expense"
                disabled={isLoading}
                rows={3}
              />
            </div>

            {error && (
              <p className="text-sm text-destructive">{error}</p>
            )}
          </div>
          <DialogFooter>
            <Button type="submit" disabled={isLoading || !categoryId}>
              {isLoading ? "Adding..." : "Add Expense"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
