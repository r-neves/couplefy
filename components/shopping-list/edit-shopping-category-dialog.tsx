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
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { updateShoppingCategoryFromClient } from "@/app/dashboard/actions/shopping-categories-actions";
import { Loader2 } from "lucide-react";

interface EditShoppingCategoryDialogProps {
  category: any;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

const COLORS = [
  "#ef4444", // red
  "#f97316", // orange
  "#f59e0b", // amber
  "#84cc16", // lime
  "#10b981", // emerald
  "#06b6d4", // cyan
  "#3b82f6", // blue
  "#6366f1", // indigo
  "#8b5cf6", // violet
  "#d946ef", // fuchsia
  "#ec4899", // pink
  "#64748b", // slate
];

const POPULAR_ICONS = [
  "🛒", "🥛", "🥖", "🍎", "🥩", "🐟", "🧀",
  "🥦", "🍅", "🥬", "🧅", "🥕", "🍞", "🥐",
  "🧼", "🧻", "🧽", "🧴", "🥤", "🍷", "☕",
  "🍫", "🍪", "🍕", "🍔", "🍝", "🥗", "🧊"
];

export function EditShoppingCategoryDialog({
  category,
  open,
  onOpenChange,
  onSuccess,
}: EditShoppingCategoryDialogProps) {
  const [loading, setLoading] = useState(false);
  const [selectedColor, setSelectedColor] = useState(category?.color || COLORS[7]);
  const [selectedIcon, setSelectedIcon] = useState(category?.icon || "");
  const [name, setName] = useState(category?.name || "");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    try {
      const formData = new FormData();
      formData.append("name", name);
      formData.append("color", selectedColor);
      if (selectedIcon) {
        formData.append("icon", selectedIcon);
      }

      const result = await updateShoppingCategoryFromClient(category.id, formData);

      if (result.error) {
        console.error(result.error);
      } else {
        onOpenChange(false);
        if (onSuccess) {
          onSuccess();
        }
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Edit Category</DialogTitle>
          <DialogDescription>
            Update the category details.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="name">Name</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Dairy, Produce"
              required
            />
          </div>

          <div className="grid gap-2">
            <Label>Icon (Optional)</Label>
            <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto p-2 border rounded-lg">
              <button
                type="button"
                className={`w-10 h-10 flex items-center justify-center rounded-lg transition-all ${
                  selectedIcon === ""
                    ? "ring-2 ring-primary bg-primary/10"
                    : "hover:bg-muted"
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
                  className={`w-10 h-10 text-2xl flex items-center justify-center rounded-lg transition-all ${
                    selectedIcon === icon
                      ? "ring-2 ring-primary bg-primary/10 scale-110"
                      : "hover:bg-muted hover:scale-110"
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
                  className={`w-6 h-6 rounded-full transition-all ${
                    selectedColor === color
                      ? "ring-2 ring-offset-2 ring-black dark:ring-white scale-110"
                      : "hover:scale-110"
                  }`}
                  style={{ backgroundColor: color }}
                  onClick={() => setSelectedColor(color)}
                />
              ))}
            </div>
          </div>

          <DialogFooter>
            <Button type="submit" disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Update Category
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
