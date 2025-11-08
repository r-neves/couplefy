"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { deleteGoal, updateGoal } from "@/app/dashboard/actions/goals";
import { Pencil, Trash2 } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

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

interface ManageGoalsDialogProps {
  goals: Goal[];
  groups: Group[];
  trigger?: React.ReactNode;
}

export function ManageGoalsDialog({ goals, groups, trigger }: ManageGoalsDialogProps) {
  const [open, setOpen] = useState(false);
  const [editingGoal, setEditingGoal] = useState<Goal | null>(null);
  const [deletingGoalId, setDeletingGoalId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleUpdate(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!editingGoal) return;

    setIsSubmitting(true);
    const formData = new FormData(e.currentTarget);
    const result = await updateGoal(editingGoal.id, formData);

    if (result.success) {
      setEditingGoal(null);
    } else {
      alert(result.error);
    }
    setIsSubmitting(false);
  }

  async function handleDelete() {
    if (!deletingGoalId) return;

    const result = await deleteGoal(deletingGoalId);
    if (result.success) {
      setDeletingGoalId(null);
    } else {
      alert(result.error);
    }
  }

  return (
    <>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          {trigger || <Button variant="outline">Manage Goals</Button>}
        </DialogTrigger>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Manage Goals</DialogTitle>
            <DialogDescription>
              Edit or delete your savings goals
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 mt-4">
            {goals.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">
                No goals yet. Create your first goal to get started.
              </p>
            ) : (
              goals.map((goal) => (
                <div key={goal.id} className="flex items-center gap-4 p-4 border rounded-lg">
                  <div
                    className="w-8 h-8 rounded-full flex-shrink-0"
                    style={{ backgroundColor: goal.color }}
                  />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{goal.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {goal.targetAmount ? `Target: $${parseFloat(goal.targetAmount).toFixed(2)}` : "No target set"}
                      {" • "}
                      {goal.groupId
                        ? groups.find(g => g.id === goal.groupId)?.name || "Shared"
                        : "Personal"}
                    </p>
                  </div>
                  <div className="flex gap-2 flex-shrink-0">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setEditingGoal(goal)}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setDeletingGoalId(goal.id)}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              ))
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      {editingGoal && (
        <Dialog open={!!editingGoal} onOpenChange={(open) => !open && setEditingGoal(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Edit Goal</DialogTitle>
              <DialogDescription>
                Update goal details
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleUpdate} className="space-y-4">
              <div>
                <Label htmlFor="name">Goal Name *</Label>
                <Input
                  id="name"
                  name="name"
                  defaultValue={editingGoal.name}
                  required
                />
              </div>

              <div>
                <Label htmlFor="targetAmount">Target Amount (optional)</Label>
                <Input
                  id="targetAmount"
                  name="targetAmount"
                  type="number"
                  step="0.01"
                  min="0"
                  defaultValue={editingGoal.targetAmount || ""}
                  placeholder="0.00"
                />
              </div>

              <div>
                <Label htmlFor="description">Description (optional)</Label>
                <Input
                  id="description"
                  name="description"
                  placeholder="What is this goal for?"
                />
              </div>

              <div>
                <Label htmlFor="color">Color</Label>
                <Input
                  id="color"
                  name="color"
                  type="color"
                  defaultValue={editingGoal.color}
                />
              </div>

              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setEditingGoal(null)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? "Saving..." : "Save Changes"}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      )}

      {/* Delete Confirmation */}
      <AlertDialog open={!!deletingGoalId} onOpenChange={(open) => !open && setDeletingGoalId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will delete the goal. Any savings using this goal will need to be reassigned.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}