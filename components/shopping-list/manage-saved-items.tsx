"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
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
import { BookMarked, Trash2, Edit2 } from "lucide-react";
import { EditSavedItemDialog } from "./edit-saved-item-dialog";
import { deleteSavedItemFromClient } from "@/app/dashboard/actions/shopping-list-actions";
import { useRouter } from "next/navigation";

interface ManageSavedItemsProps {
  savedItems: any[];
  categories: any[];
}

export function ManageSavedItems({ savedItems, categories }: ManageSavedItemsProps) {
  const [open, setOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<any | null>(null);
  const [deletingItemId, setDeletingItemId] = useState<string | null>(null);
  const router = useRouter();

  // Sort saved items by category name, then alphabetically by item name
  const sortedSavedItems = [...savedItems].sort((a, b) => {
    const categoryA = categories.find(c => c.id === a.category_id);
    const categoryB = categories.find(c => c.id === b.category_id);

    const categoryNameA = categoryA?.name || '';
    const categoryNameB = categoryB?.name || '';

    // First sort by category name
    if (categoryNameA !== categoryNameB) {
      return categoryNameA.localeCompare(categoryNameB);
    }

    // Then sort by item name within same category
    const namesObjA = a.names as Record<string, string>;
    const namesObjB = b.names as Record<string, string>;
    const displayNameA = namesObjA.default || Object.values(namesObjA)[0] || '';
    const displayNameB = namesObjB.default || Object.values(namesObjB)[0] || '';

    return displayNameA.localeCompare(displayNameB);
  });

  const handleDelete = async () => {
    if (!deletingItemId) return;

    await deleteSavedItemFromClient(deletingItemId);
    setDeletingItemId(null);
    router.refresh();
  };

  return (
    <>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <Button variant="outline" size="default" className="gap-2 h-11">
            <BookMarked className="h-4 w-4" />
            <span className="hidden sm:inline">Saved Items</span>
            <span className="sm:hidden">Saved</span>
          </Button>
        </DialogTrigger>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Saved Items</DialogTitle>
            <DialogDescription>
              Manage your frequently used shopping items
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-2 max-h-[400px] overflow-y-auto py-4">
            {sortedSavedItems.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No saved items yet. Create items and check "Save as frequently used" to add them here.
              </div>
            ) : (
              sortedSavedItems.map((item) => {
                const namesObj = item.names as Record<string, string>;
                const displayName = namesObj.default || Object.values(namesObj)[0] || "Unknown";
                const category = categories.find(c => c.id === item.category_id);

                return (
                  <div
                    key={item.id}
                    className="flex items-center justify-between p-3 rounded-lg border bg-card"
                  >
                    <div className="flex items-center gap-3">
                      {category?.icon ? (
                        <span className="text-xl">{category.icon}</span>
                      ) : (
                        <div
                          className="w-4 h-4 rounded-full"
                          style={{ backgroundColor: category?.color || "#6366f1" }}
                        />
                      )}
                      <div>
                        <span className="font-medium">{displayName}</span>
                        {/* Backward compatibility: check for 'secondary' first, then 'pt' */}
                        {(namesObj.secondary || namesObj.pt) && (namesObj.secondary || namesObj.pt) !== displayName && (
                          <span className="text-sm text-muted-foreground ml-2">({namesObj.secondary || namesObj.pt})</span>
                        )}
                        <div className="text-xs text-muted-foreground">
                          {category?.name}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setEditingItem(item)}
                        className="text-muted-foreground hover:text-primary"
                      >
                        <Edit2 className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setDeletingItemId(item.id)}
                        className="text-muted-foreground hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </DialogContent>
      </Dialog>

      {editingItem && (
        <EditSavedItemDialog
          item={editingItem}
          categories={categories}
          open={!!editingItem}
          onOpenChange={(open) => !open && setEditingItem(null)}
          onSuccess={() => {
            setEditingItem(null);
            router.refresh();
          }}
        />
      )}

      <AlertDialog open={!!deletingItemId} onOpenChange={(open) => !open && setDeletingItemId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Saved Item?</AlertDialogTitle>
            <AlertDialogDescription>
              This item will no longer appear in your search results. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
