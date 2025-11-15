"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { createGoalFromClient } from "@/app/dashboard/actions/goals";

interface Group {
  id: string;
  name: string;
}

interface CreateGoalDialogProps {
  groups: Group[];
  trigger?: React.ReactNode;
}

export function CreateGoalDialog({ groups, trigger }: CreateGoalDialogProps) {
  const [open, setOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [groupId, setGroupId] = useState<string>("personal");

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setIsSubmitting(true);

    const formData = new FormData(e.currentTarget);
    // Add groupId if it's not personal
    if (groupId !== "personal") {
      formData.append("groupId", groupId);
    }

    const result = await createGoalFromClient(formData);

    if (result.success) {
      setOpen(false);
      setGroupId("personal");
      e.currentTarget.reset();
    } else {
      alert(result.error);
    }

    setIsSubmitting(false);
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || <Button>+ Goal</Button>}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create New Goal</DialogTitle>
          <DialogDescription>
            Add a new savings goal. You can optionally set a target amount to track progress.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="name">Goal Name *</Label>
            <Input
              id="name"
              name="name"
              placeholder="e.g., Vacation Fund, Emergency Fund"
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
              defaultValue="#10b981"
            />
          </div>

          <div>
            <Label htmlFor="groupId">Type</Label>
            <Select value={groupId} onValueChange={setGroupId}>
              <SelectTrigger>
                <SelectValue placeholder="Personal Goal" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="personal">Personal Goal</SelectItem>
                {groups.map((group) => (
                  <SelectItem key={group.id} value={group.id}>
                    {group.name} (Shared)
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Creating..." : "Create Goal"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}