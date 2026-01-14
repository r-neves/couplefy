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
import { createShoppingListItemFromClient, createSavedItemFromClient } from "@/app/dashboard/actions/shopping-list-actions";
import { Loader2, Plus } from "lucide-react";

interface AddItemDialogProps {
  userId: string;
  groupId?: string;
  categories: any[];
  onItemAdded?: () => void;
  trigger?: React.ReactNode;
}

export function AddItemDialog({
  userId,
  groupId,
  categories,
  onItemAdded,
  trigger
}: AddItemDialogProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  // Form State
  const [customName, setCustomName] = useState("");
  const [nameSecondary, setNameSecondary] = useState("");
  const [unit, setUnit] = useState("");
  const [categoryId, setCategoryId] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!customName || !categoryId) {
      console.error("Name and category required");
      return;
    }

    setLoading(true);

    try {
      const formData = new FormData();
      formData.append("name", customName);
      formData.append("quantity", "1");
      formData.append("unit", unit);
      formData.append("categoryId", categoryId);
      if (groupId) formData.append("groupId", groupId);

      const result = await createShoppingListItemFromClient(formData);

      if (result.error) {
        throw new Error(result.error);
      }

      // Always save created items for future searches
      const names: Record<string, string> = {};
      if (customName) names.default = customName;
      if (nameSecondary) names.secondary = nameSecondary;
      await createSavedItemFromClient(names, categoryId, groupId);

      // Reset form
      setOpen(false);
      setCustomName("");
      setNameSecondary("");
      setUnit("");
      setCategoryId("");

      if (onItemAdded) onItemAdded();

    } catch (error: any) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
            <Button size="lg" className="shadow-lg hover:shadow-xl transition-all w-full sm:w-auto">
            <Plus className="mr-2 h-5 w-5" /> Create Item
            </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl">Create New Item</DialogTitle>
          <DialogDescription>
            Create a new item for your {groupId ? "group" : "personal"} shopping list
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="customName">Item Name</Label>
              <Input
                id="customName"
                placeholder="e.g., Milk"
                value={customName}
                onChange={(e) => setCustomName(e.target.value)}
                className="h-12 text-base"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="nameSecondary">Secondary Name (Optional)</Label>
              <Input
                id="nameSecondary"
                placeholder="e.g., Leite, 牛奶, etc."
                value={nameSecondary}
                onChange={(e) => setNameSecondary(e.target.value)}
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

            <div className="space-y-2">
              <Label htmlFor="unit">Unit (Optional)</Label>
              <Input
                id="unit"
                placeholder="kg, L, pack"
                value={unit}
                onChange={(e) => setUnit(e.target.value)}
                className="h-12 text-base"
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              type="submit"
              disabled={loading || !customName || !categoryId}
              size="lg"
              className="w-full h-12"
            >
              {loading && <Loader2 className="mr-2 h-5 w-5 animate-spin" />}
              Create Item
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
