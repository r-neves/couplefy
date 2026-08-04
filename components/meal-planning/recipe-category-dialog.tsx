"use client";

import { useEffect, useState } from "react";
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
import { Loader2 } from "lucide-react";
import {
  createRecipeCategoryFromClient,
  updateRecipeCategoryFromClient,
  type RecipeCategoryDTO,
} from "@/app/dashboard/actions/recipe-categories-actions";

const COLORS = [
  "#ef4444", // red
  "#f97316", // orange
  "#f59e0b", // amber
  "#84cc16", // lime
  "#22c55e", // green
  "#10b981", // emerald
  "#06b6d4", // cyan
  "#3b82f6", // blue
  "#6366f1", // indigo
  "#8b5cf6", // violet
  "#ec4899", // pink
  "#64748b", // slate
];

const POPULAR_ICONS = [
  "🥩", "🍗", "🐟", "🦐", "🥦", "🥗", "🍲", "🍜",
  "🍝", "🍚", "🥘", "🌮", "🍕", "🥪", "🥚", "🧀",
  "🍳", "🥧", "🍰", "🥣", "🫕", "🍛", "🥙", "🍱",
];

interface RecipeCategoryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  groupId?: string;
  /** Omit to create a new category. */
  category?: RecipeCategoryDTO | null;
  onSuccess?: () => void;
}

export function RecipeCategoryDialog({
  open,
  onOpenChange,
  groupId,
  category,
  onSuccess,
}: RecipeCategoryDialogProps) {
  const isEditing = !!category;

  const [name, setName] = useState("");
  const [selectedColor, setSelectedColor] = useState(COLORS[8]);
  const [selectedIcon, setSelectedIcon] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;

    setError(null);
    setName(category?.name ?? "");
    setSelectedColor(category?.color ?? COLORS[8]);
    setSelectedIcon(category?.icon ?? "");
  }, [open, category]);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);

    if (!name.trim()) {
      setError("Name is required");
      return;
    }

    setLoading(true);

    try {
      const formData = new FormData();
      formData.append("name", name.trim());
      formData.append("color", selectedColor);
      if (selectedIcon) formData.append("icon", selectedIcon);
      if (groupId) formData.append("groupId", groupId);

      const result = isEditing
        ? await updateRecipeCategoryFromClient(category.id, formData)
        : await createRecipeCategoryFromClient(formData);

      if ("error" in result && result.error) {
        setError(result.error);
        return;
      }

      onOpenChange(false);
      onSuccess?.();
    } catch (err) {
      console.error("Failed to save recipe category:", err);
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{isEditing ? "Edit Type" : "New Recipe Type"}</DialogTitle>
          <DialogDescription>
            Types are the columns of your recipe board, like Meat or Soups.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="category-name">Name</Label>
            <Input
              id="category-name"
              placeholder="e.g., Meat, Fish, Veg"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="h-12 text-base"
              maxLength={100}
              required
            />
          </div>

          <div className="grid gap-2">
            <Label>Icon (optional)</Label>
            <div className="flex max-h-32 flex-wrap gap-2 overflow-y-auto rounded-lg border p-2">
              <button
                type="button"
                className={`flex h-10 w-10 items-center justify-center rounded-lg transition-all ${
                  selectedIcon === "" ? "bg-primary/10 ring-2 ring-primary" : "hover:bg-muted"
                }`}
                onClick={() => setSelectedIcon("")}
                title="No icon"
              >
                <span className="text-xs text-muted-foreground">None</span>
              </button>
              {POPULAR_ICONS.map((icon) => (
                <button
                  key={icon}
                  type="button"
                  className={`flex h-10 w-10 items-center justify-center rounded-lg text-2xl transition-all ${
                    selectedIcon === icon
                      ? "scale-110 bg-primary/10 ring-2 ring-primary"
                      : "hover:scale-110 hover:bg-muted"
                  }`}
                  onClick={() => setSelectedIcon(icon)}
                  title={icon}
                >
                  {icon}
                </button>
              ))}
            </div>
          </div>

          <div className="grid gap-2">
            <Label>Color</Label>
            <div className="flex flex-wrap gap-2">
              {COLORS.map((color) => (
                <button
                  key={color}
                  type="button"
                  className={`h-6 w-6 rounded-full transition-all ${
                    selectedColor === color
                      ? "scale-110 ring-2 ring-black ring-offset-2 dark:ring-white"
                      : "hover:scale-110"
                  }`}
                  style={{ backgroundColor: color }}
                  onClick={() => setSelectedColor(color)}
                  aria-label={`Select color ${color}`}
                />
              ))}
            </div>
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}

          <DialogFooter>
            <Button type="submit" disabled={loading || !name.trim()}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isEditing ? "Save Changes" : "Create Type"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
