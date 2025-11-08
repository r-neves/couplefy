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
import { createSaving } from "@/app/dashboard/actions/savings";
import { useRouter } from "next/navigation";
import { PiggyBank } from "lucide-react";

interface Goal {
  id: string;
  name: string;
  color: string;
  targetAmount: string | null;
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

interface CreateSavingDialogProps {
  goals: Goal[];
  groups: Group[];
  groupsWithMembers: GroupWithMembers[];
  currentUserId: string;
  trigger?: React.ReactNode;
}

export function CreateSavingDialog({ goals, groups, groupsWithMembers, currentUserId, trigger }: CreateSavingDialogProps) {
  const [open, setOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [goalId, setGoalId] = useState("");
  const [groupId, setGroupId] = useState("");
  const [paidById, setPaidById] = useState(currentUserId);
  const router = useRouter();

  // Filter goals based on selected group
  const availableGoals = goals.filter(g => {
    // If personal is selected, show only personal goals (no groupId)
    if (!groupId) {
      return g.groupId === null;
    }

    // If a group is selected, show only goals for that group
    return g.groupId === groupId;
  });

  // Reset paidById when currentUserId changes
  useEffect(() => {
    setPaidById(currentUserId);
  }, [currentUserId]);

  // Reset paidById and goalId when group changes
  useEffect(() => {
    setPaidById(currentUserId);
    setGoalId(""); // Reset goal when type changes
  }, [groupId, currentUserId]);

  // Get the selected group's members
  const selectedGroup = groupsWithMembers.find(g => g.id === groupId);
  const groupMembers = selectedGroup?.members || [];

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setIsLoading(true);
    setError("");

    const formData = new FormData(e.currentTarget);
    formData.append("goalId", goalId);
    if (groupId) {
      formData.append("groupId", groupId);
      formData.append("paidById", paidById);
    }

    const result = await createSaving(formData);

    if (result.error) {
      setError(result.error);
      setIsLoading(false);
    } else {
      setOpen(false);
      setIsLoading(false);
      setGoalId("");
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
        {trigger || (
          <Button className="w-full justify-start gap-3 h-auto py-3 px-4" variant="outline">
            <PiggyBank className="h-5 w-5 flex-shrink-0" />
            <div className="text-left">
              <div className="font-semibold text-sm">Add Saving</div>
              <div className="text-xs text-muted-foreground">Record a saving</div>
            </div>
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Add Saving</DialogTitle>
            <DialogDescription>
              Record a new savings transaction
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
                {groupId ? "Shared with your couple" : "Personal saving"}
              </p>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="goal">Goal</Label>
              <Select value={goalId} onValueChange={setGoalId} disabled={isLoading} required>
                <SelectTrigger>
                  <SelectValue placeholder="Select a goal" />
                </SelectTrigger>
                <SelectContent>
                  {availableGoals.length === 0 ? (
                    <div className="p-2 text-sm text-muted-foreground">
                      No goals available for this type. Create one first.
                    </div>
                  ) : (
                    availableGoals.map((goal) => (
                      <SelectItem key={goal.id} value={goal.id}>
                        <div className="flex items-center gap-2">
                          <div
                            className="w-3 h-3 rounded-full"
                            style={{ backgroundColor: goal.color }}
                          />
                          {goal.name}
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
                <Label htmlFor="paidBy">Saved by</Label>
                <Select value={paidById} onValueChange={setPaidById} disabled={isLoading}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select who saved" />
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
                placeholder="Add a note about this saving"
                disabled={isLoading}
                rows={3}
              />
            </div>

            {error && (
              <p className="text-sm text-destructive">{error}</p>
            )}
          </div>
          <DialogFooter>
            <Button type="submit" disabled={isLoading || !goalId}>
              {isLoading ? "Adding..." : "Add Saving"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
