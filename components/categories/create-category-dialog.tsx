"use client";

import { useState } from "react";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { createCategoryFromClient } from "@/app/dashboard/actions/categories";
import { useRouter } from "next/navigation";

interface Group {
  id: string;
  name: string;
}

interface CreateCategoryDialogProps {
  groups?: Group[];
  trigger?: React.ReactNode;
}

export function CreateCategoryDialog({ groups = [], trigger }: CreateCategoryDialogProps) {
  const [open, setOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [type, setType] = useState<"expense" | "saving" | "both">("expense");
  const [groupId, setGroupId] = useState("");
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setIsLoading(true);
    setError("");

    const formData = new FormData(e.currentTarget);
    if (groupId) {
      formData.append("groupId", groupId);
    }
    formData.append("type", type);

    const result = await createCategoryFromClient(formData);

    if (result.error) {
      setError(result.error);
      setIsLoading(false);
    } else {
      setOpen(false);
      setIsLoading(false);
      router.refresh();
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || <Button>Create Category</Button>}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Create Category</DialogTitle>
            <DialogDescription>
              Create a new category for expenses or savings.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="name">Category Name</Label>
              <Input
                id="name"
                name="name"
                placeholder="e.g., Groceries, Entertainment"
                required
                disabled={isLoading}
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="type">Category Type</Label>
              <Select value={type} onValueChange={(value: any) => setType(value)} disabled={isLoading}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="expense">Expense</SelectItem>
                  <SelectItem value="saving">Saving</SelectItem>
                  <SelectItem value="both">Both</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="sharing">Sharing</Label>
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
                {groupId ? "Shared with your couple" : "Personal category"}
              </p>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="color">Color</Label>
              <Input
                id="color"
                name="color"
                type="color"
                defaultValue="#6366f1"
                disabled={isLoading}
              />
            </div>

            {error && (
              <p className="text-sm text-destructive">{error}</p>
            )}
          </div>
          <DialogFooter>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? "Creating..." : "Create Category"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
