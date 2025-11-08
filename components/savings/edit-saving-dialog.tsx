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

interface Saving {
  id: string;
  amount: string;
  categoryId: string;
  description: string | null;
  date: Date;
  groupId: string | null;
  userId: string;
}

interface EditSavingDialogProps {
  saving: Saving;
  categories: Category[];
  groups: Group[];
  groupsWithMembers: GroupWithMembers[];
  currentUserId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function EditSavingDialog({
  saving,
  categories,
  groups,
  groupsWithMembers,
  currentUserId,
  open,
  onOpenChange
}: EditSavingDialogProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [categoryId, setCategoryId] = useState(saving.categoryId);
  const [groupId, setGroupId] = useState(saving.groupId || "");
  const [paidById, setPaidById] = useState(saving.userId);
  const router = useRouter();

  // Filter categories based on type (saving/both) and selected group
  const savingCategories = categories.filter(c => {
    const isSavingType = c.type === "saving" || c.type === "both";
    if (!isSavingType) return false;

    // If personal is selected, show only personal categories (no groupId)
    if (!groupId) {
      return c.groupId === null;
    }

    // If a group is selected, show only categories for that group
    return c.groupId === groupId;
  });

  // Reset form when saving changes
  useEffect(() => {
    setCategoryId(saving.categoryId);
    setGroupId(saving.groupId || "");
    setPaidById(saving.userId);
  }, [saving]);

  // Reset paidById and categoryId when group changes (but only for user-initiated changes)
  useEffect(() => {
    // Only reset if the groupId is different from the original saving's groupId
    if (groupId !== (saving.groupId || "")) {
      setPaidById(currentUserId);
      setCategoryId(""); // Reset category when type changes
    }
  }, [groupId, currentUserId, saving.groupId]);

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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Edit Saving</DialogTitle>
            <DialogDescription>
              Update the saving transaction details
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
              <Label htmlFor="category">Category</Label>
              <Select value={categoryId} onValueChange={setCategoryId} disabled={isLoading} required>
                <SelectTrigger>
                  <SelectValue placeholder="Select a category" />
                </SelectTrigger>
                <SelectContent>
                  {savingCategories.length === 0 ? (
                    <div className="p-2 text-sm text-muted-foreground">
                      No categories available for this type. Create one first.
                    </div>
                  ) : (
                    savingCategories.map((category) => (
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
                defaultValue={new Date(saving.date).toISOString().split('T')[0]}
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
            <Button type="submit" disabled={isLoading || !categoryId}>
              {isLoading ? "Updating..." : "Update Saving"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
