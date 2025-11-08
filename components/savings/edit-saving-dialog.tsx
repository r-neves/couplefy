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
import { updateSaving } from "@/app/dashboard/actions/savings";
import { useRouter } from "next/navigation";

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

interface Saving {
  id: string;
  amount: string;
  goalId: string;
  description: string | null;
  date: Date;
  groupId: string | null;
  userId: string;
}

interface EditSavingDialogProps {
  saving: Saving;
  goals: Goal[];
  groups: Group[];
  groupsWithMembers: GroupWithMembers[];
  currentUserId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function EditSavingDialog({
  saving,
  goals,
  groups,
  groupsWithMembers,
  currentUserId,
  open,
  onOpenChange
}: EditSavingDialogProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [goalId, setGoalId] = useState(saving.goalId);
  const [groupId, setGroupId] = useState(saving.groupId || "");
  const [paidById, setPaidById] = useState(saving.userId);
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

  // Reset goalId when group changes
  useEffect(() => {
    setGoalId(saving.goalId);
  }, [groupId, saving.goalId]);

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

    const result = await updateSaving(saving.id, formData);

    if (result.error) {
      setError(result.error);
      setIsLoading(false);
    } else {
      onOpenChange(false);
      setIsLoading(false);
      router.refresh();
    }
  }

  // Format date for input
  const formattedDate = new Date(saving.date).toISOString().split('T')[0];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Edit Saving</DialogTitle>
            <DialogDescription>
              Update this savings transaction
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
                defaultValue={saving.amount}
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
                defaultValue={formattedDate}
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
                defaultValue={saving.description || ""}
                disabled={isLoading}
                rows={3}
              />
            </div>

            {error && (
              <p className="text-sm text-destructive">{error}</p>
            )}
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isLoading}>
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading || !goalId}>
              {isLoading ? "Saving..." : "Save Changes"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}