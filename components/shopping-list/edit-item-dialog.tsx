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
import { createShoppingListItemFromClient, deleteShoppingItemFromClient } from "@/app/dashboard/actions/shopping-list-actions";
import { Loader2 } from "lucide-react";

interface EditItemDialogProps {
  item: any;
  categories: any[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onItemUpdated: () => void;
}

export function EditItemDialog({
  item,
  categories,
  open,
  onOpenChange,
  onItemUpdated,
}: EditItemDialogProps) {
  const [loading, setLoading] = useState(false);
  const [name, setName] = useState("");
  const [quantity, setQuantity] = useState("1");
  const [unit, setUnit] = useState("");
  const [categoryId, setCategoryId] = useState("");

  // Populate form when item changes
  useEffect(() => {
    if (item) {
      setName(item.name || "");
      setQuantity(item.quantity?.toString() || "1");
      setUnit(item.unit || "");
      setCategoryId(item.category_id || "");
    }
  }, [item]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name || !categoryId) return;

    setLoading(true);

    try {
      // Delete old item and create new one (simulating update)
      await deleteShoppingItemFromClient(item.id);

      const formData = new FormData();
      formData.append("name", name);
      formData.append("quantity", quantity);
      formData.append("unit", unit);
      formData.append("categoryId", categoryId);
      if (item.group_id) formData.append("groupId", item.group_id);

      const result = await createShoppingListItemFromClient(formData);

      if (result.error) {
        throw new Error(result.error);
      }

      onOpenChange(false);
      onItemUpdated();
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
          <DialogTitle>Edit Item</DialogTitle>
          <DialogDescription>
            Make changes to your shopping list item
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="edit-name">Item Name</Label>
            <Input
              id="edit-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="h-12 text-base"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="edit-quantity">Quantity</Label>
              <Input
                id="edit-quantity"
                type="number"
                min="0"
                step="0.1"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                className="h-12 text-base"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-unit">Unit</Label>
              <Input
                id="edit-unit"
                placeholder="kg, L, pack"
                value={unit}
                onChange={(e) => setUnit(e.target.value)}
                className="h-12 text-base"
              />
            </div>
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
