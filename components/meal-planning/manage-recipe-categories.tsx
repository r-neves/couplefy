"use client";

import { useEffect, useState } from "react";
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
import { Edit2, GripVertical, Plus, Settings, Trash2 } from "lucide-react";
import { RecipeCategoryDialog } from "./recipe-category-dialog";
import {
  deleteRecipeCategoryFromClient,
  updateRecipeCategoryOrderFromClient,
  type RecipeCategoryDTO,
} from "@/app/dashboard/actions/recipe-categories-actions";
import { useRouter } from "next/navigation";

interface ManageRecipeCategoriesProps {
  categories: RecipeCategoryDTO[];
  groupId?: string;
  /** Recipe counts by category id, so we can warn before a blocked delete. */
  recipeCounts: Record<string, number>;
}

export function ManageRecipeCategories({
  categories,
  groupId,
  recipeCounts,
}: ManageRecipeCategoriesProps) {
  const [open, setOpen] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<RecipeCategoryDTO | null>(null);
  const [deletingCategory, setDeletingCategory] = useState<RecipeCategoryDTO | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [localCategories, setLocalCategories] = useState(categories);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const router = useRouter();

  useEffect(() => {
    setLocalCategories(categories);
  }, [categories]);

  const handleDelete = async () => {
    if (!deletingCategory) return;

    const result = await deleteRecipeCategoryFromClient(deletingCategory.id);

    if ("error" in result && result.error) {
      setDeleteError(result.error);
      return;
    }

    setDeletingCategory(null);
    setDeleteError(null);
    router.refresh();
  };

  const handleDragStart = (e: React.DragEvent, index: number) => {
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDragEnter = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === index) return;

    const reordered = [...localCategories];
    const [dragged] = reordered.splice(draggedIndex, 1);
    reordered.splice(index, 0, dragged);

    setLocalCategories(reordered);
    setDraggedIndex(index);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  };

  const handleDragEnd = async () => {
    if (draggedIndex === null) return;

    setDraggedIndex(null);
    await updateRecipeCategoryOrderFromClient(localCategories.map((cat) => cat.id));
    router.refresh();
  };

  return (
    <>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <Button variant="outline" size="default" className="h-11 gap-2">
            <Settings className="h-4 w-4" />
            <span className="hidden sm:inline">Manage Types</span>
            <span className="sm:hidden">Types</span>
          </Button>
        </DialogTrigger>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Recipe Types</DialogTitle>
            <DialogDescription>
              Manage the columns of your {groupId ? "group" : "personal"} recipe board.
              Drag to reorder.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <Button onClick={() => setCreateOpen(true)} className="h-12 w-full" size="lg">
              <Plus className="mr-2 h-5 w-5" />
              Add New Type
            </Button>

            <div className="max-h-[400px] space-y-2 overflow-y-auto">
              {localCategories.length === 0 ? (
                <div className="py-8 text-center text-muted-foreground">
                  No types yet. Create one to get started!
                </div>
              ) : (
                localCategories.map((category, index) => (
                  <div
                    key={category.id}
                    draggable
                    onDragStart={(e) => handleDragStart(e, index)}
                    onDragEnter={(e) => handleDragEnter(e, index)}
                    onDragOver={handleDragOver}
                    onDragEnd={handleDragEnd}
                    className="flex cursor-move items-center justify-between rounded-lg border bg-card p-3 transition-colors hover:bg-accent/50"
                  >
                    <div className="flex items-center gap-3">
                      <GripVertical className="h-5 w-5 text-muted-foreground" />
                      {category.icon ? (
                        <span className="text-xl">{category.icon}</span>
                      ) : (
                        <div
                          className="h-4 w-4 rounded-full"
                          style={{ backgroundColor: category.color || "#6366f1" }}
                        />
                      )}
                      <div>
                        <span className="font-medium">{category.name}</span>
                        <div className="text-xs text-muted-foreground">
                          {recipeCounts[category.id] ?? 0} recipes
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setEditingCategory(category)}
                        className="text-muted-foreground hover:text-primary"
                        aria-label={`Edit ${category.name}`}
                      >
                        <Edit2 className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => {
                          setDeleteError(null);
                          setDeletingCategory(category);
                        }}
                        className="text-muted-foreground hover:text-destructive"
                        aria-label={`Delete ${category.name}`}
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

      <RecipeCategoryDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        groupId={groupId}
        onSuccess={() => router.refresh()}
      />

      <RecipeCategoryDialog
        open={!!editingCategory}
        onOpenChange={(isOpen) => !isOpen && setEditingCategory(null)}
        groupId={groupId}
        category={editingCategory}
        onSuccess={() => {
          setEditingCategory(null);
          router.refresh();
        }}
      />

      <AlertDialog
        open={!!deletingCategory}
        onOpenChange={(isOpen) => {
          if (!isOpen) {
            setDeletingCategory(null);
            setDeleteError(null);
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete “{deletingCategory?.name}”?</AlertDialogTitle>
            <AlertDialogDescription>
              {deleteError
                ? deleteError
                : "This type will be removed from your board. This action cannot be undone."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            {!deleteError && (
              <AlertDialogAction
                onClick={(e) => {
                  // Keep the dialog open so a blocked delete can show its reason.
                  e.preventDefault();
                  handleDelete();
                }}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                Delete
              </AlertDialogAction>
            )}
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
