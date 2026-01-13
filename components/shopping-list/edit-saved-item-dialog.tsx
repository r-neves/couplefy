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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { updateSavedItemFromClient } from "@/app/dashboard/actions/shopping-list-actions";
import { Loader2 } from "lucide-react";

interface EditSavedItemDialogProps {
  item: any;
  categories: any[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export function EditSavedItemDialog({
  item,
  categories,
  open,
  onOpenChange,
  onSuccess,
}: EditSavedItemDialogProps) {
  const [loading, setLoading] = useState(false);
  const [nameDefault, setNameDefault] = useState("");
  const [nameSecondary, setNameSecondary] = useState("");
  const [categoryId, setCategoryId] = useState("");

  useEffect(() => {
    if (item) {
      const namesObj = item.names as Record<string, string>;
      setNameDefault(namesObj.default || "");
      // Backward compatibility: check for 'secondary' first, then 'pt'
      setNameSecondary(namesObj.secondary || namesObj.pt || "");
      setCategoryId(item.category_id || "");
    }
  }, [item]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!nameDefault || !categoryId) return;

    setLoading(true);

    try {
      const names: Record<string, string> = {};
      if (nameDefault) names.default = nameDefault;
      if (nameSecondary) names.secondary = nameSecondary;

      const result = await updateSavedItemFromClient(item.id, names, categoryId);

      if (result.error) {
        throw new Error(result.error);
      }

      onOpenChange(false);
      if (onSuccess) {
        onSuccess();
      }
    } catch (error: any) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Edit Saved Item</DialogTitle>
          <DialogDescription>
            Update the saved item details
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="edit-name-default">Item Name</Label>
            <Input
              id="edit-name-default"
              value={nameDefault}
              onChange={(e) => setNameDefault(e.target.value)}
              className="h-12 text-base"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="edit-name-secondary">Secondary Name (Optional)</Label>
            <Input
              id="edit-name-secondary"
              value={nameSecondary}
              onChange={(e) => setNameSecondary(e.target.value)}
              placeholder="e.g., Leite, 牛奶, etc."
              className="h-12 text-base"
            />
          </div>

          <div className="space-y-2">
            <Label>Category</Label>
            <Select value={categoryId} onValueChange={setCategoryId} required>
              <SelectTrigger className="h-12 text-base">
                <SelectValue placeholder="Select a category" />
              </SelectTrigger>
              <SelectContent>
                {categories.map((category) => (
                  <SelectItem key={category.id} value={category.id} className="h-12">
                    <div className="flex items-center gap-2">
                      {category.icon ? (
                        <span className="text-lg">{category.icon}</span>
                      ) : (
                        <div
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: category.color }}
                        />
                      )}
                      <span>{category.name}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <DialogFooter>
            <Button type="submit" disabled={loading} size="lg" className="w-full h-12">
              {loading && <Loader2 className="mr-2 h-5 w-5 animate-spin" />}
              Save Changes
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
