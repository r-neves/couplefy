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
import { Settings, Plus, Trash2, Edit2 } from "lucide-react";
import { CreateShoppingCategoryDialog } from "./create-shopping-category-dialog";
import { EditShoppingCategoryDialog } from "./edit-shopping-category-dialog";
import { deleteShoppingCategoryFromClient } from "@/app/dashboard/actions/shopping-categories-actions";
import { useRouter } from "next/navigation";

interface ManageShoppingCategoriesProps {
  categories: any[];
  userId: string;
  groupId?: string;
}

export function ManageShoppingCategories({ categories, userId, groupId }: ManageShoppingCategoriesProps) {
  const [open, setOpen] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<any | null>(null);
  const [deletingCategoryId, setDeletingCategoryId] = useState<string | null>(null);
  const router = useRouter();

  const handleDelete = async () => {
    if (!deletingCategoryId) return;

    await deleteShoppingCategoryFromClient(deletingCategoryId);
    setDeletingCategoryId(null);
    router.refresh();
  };

  return (
    <>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <Button variant="outline" size="default" className="gap-2 h-11">
            <Settings className="h-4 w-4" />
            <span className="hidden sm:inline">Manage Categories</span>
            <span className="sm:hidden">Categories</span>
          </Button>
        </DialogTrigger>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Shopping Categories</DialogTitle>
            <DialogDescription>
              Manage categories for your {groupId ? "group" : "personal"} shopping list
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <Button 
              onClick={() => setCreateOpen(true)}
              className="w-full h-12"
              size="lg"
            >
              <Plus className="mr-2 h-5 w-5" />
              Add New Category
            </Button>

            <div className="space-y-2 max-h-[400px] overflow-y-auto">
              {categories.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No categories yet. Create one to get started!
                </div>
              ) : (
                categories.map((category) => (
                  <div
                    key={category.id}
                    className="flex items-center justify-between p-3 rounded-lg border bg-card"
                  >
                    <div className="flex items-center gap-3">
                      {category.icon ? (
                        <span className="text-xl">{category.icon}</span>
                      ) : (
                        <div
                          className="w-4 h-4 rounded-full"
                          style={{ backgroundColor: category.color }}
                        />
                      )}
                      <span className="font-medium">{category.name}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setEditingCategory(category)}
                        className="text-muted-foreground hover:text-primary"
                      >
                        <Edit2 className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setDeletingCategoryId(category.id)}
                        className="text-muted-foreground hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <CreateShoppingCategoryDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        userId={userId}
        groupId={groupId}
        onSuccess={() => {
          router.refresh();
        }}
      />

      {editingCategory && (
        <EditShoppingCategoryDialog
          category={editingCategory}
          open={!!editingCategory}
          onOpenChange={(open) => !open && setEditingCategory(null)}
          onSuccess={() => {
            setEditingCategory(null);
            router.refresh();
          }}
        />
      )}

      <AlertDialog open={!!deletingCategoryId} onOpenChange={(open) => !open && setDeletingCategoryId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Category?</AlertDialogTitle>
            <AlertDialogDescription>
              This will delete the category and all items using it will need to be reassigned to another category. This action cannot be undone.
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
