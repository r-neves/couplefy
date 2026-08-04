"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Check, Link2Off, Loader2, ShoppingCart } from "lucide-react";
import {
  getRecipeShoppingPreviewFromClient,
  addRecipeIngredientsToShoppingListFromClient,
  type ShoppingPreviewIngredient,
} from "@/app/dashboard/actions/recipe-shopping-actions";
import type { RecipeDTO } from "@/app/dashboard/actions/recipes-actions";
import { cn } from "@/lib/utils";

interface AddToListDialogProps {
  recipe: RecipeDTO | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAdded: () => void;
}

interface RowState {
  selected: boolean;
  quantity: string;
  unit: string;
}

export function AddToListDialog({
  recipe,
  open,
  onOpenChange,
  onAdded,
}: AddToListDialogProps) {
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [ingredients, setIngredients] = useState<ShoppingPreviewIngredient[]>([]);
  const [rows, setRows] = useState<Record<string, RowState>>({});
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open || !recipe) return;

    let cancelled = false;
    setLoading(true);
    setError(null);

    getRecipeShoppingPreviewFromClient(recipe.id)
      .then((result) => {
        if (cancelled) return;

        if ("error" in result && result.error) {
          setError(result.error);
          setIngredients([]);
          return;
        }

        const list = "ingredients" in result ? result.ingredients : [];
        setIngredients(list);
        // Nothing pre-checked: you tick only what you actually need to buy.
        setRows(
          Object.fromEntries(
            list.map((ingredient) => [
              ingredient.ingredientId,
              {
                selected: false,
                quantity: ingredient.quantity != null ? String(ingredient.quantity) : "",
                unit: ingredient.unit ?? "",
              },
            ])
          )
        );
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [open, recipe]);

  const linkedIngredients = ingredients.filter((ingredient) => ingredient.linked);
  const unlinkedCount = ingredients.length - linkedIngredients.length;
  const selectedCount = linkedIngredients.filter(
    (ingredient) => rows[ingredient.ingredientId]?.selected
  ).length;
  const allSelected =
    linkedIngredients.length > 0 && selectedCount === linkedIngredients.length;

  const toggleRow = (ingredientId: string) => {
    setRows((prev) => ({
      ...prev,
      [ingredientId]: { ...prev[ingredientId], selected: !prev[ingredientId]?.selected },
    }));
  };

  const toggleAll = () => {
    const next = !allSelected;
    setRows((prev) => {
      const updated = { ...prev };
      for (const ingredient of linkedIngredients) {
        updated[ingredient.ingredientId] = {
          ...updated[ingredient.ingredientId],
          selected: next,
        };
      }
      return updated;
    });
  };

  const handleSubmit = async () => {
    if (!recipe || selectedCount === 0) return;

    setSubmitting(true);
    setError(null);

    try {
      const selections = linkedIngredients
        .filter((ingredient) => rows[ingredient.ingredientId]?.selected)
        .map((ingredient) => {
          const row = rows[ingredient.ingredientId];
          const parsed = row.quantity.trim() ? Number(row.quantity) : null;

          return {
            ingredientId: ingredient.ingredientId,
            quantity: parsed != null && Number.isFinite(parsed) ? parsed : null,
            unit: row.unit.trim() || null,
          };
        });

      const result = await addRecipeIngredientsToShoppingListFromClient(
        recipe.id,
        selections
      );

      if ("error" in result && result.error) {
        setError(result.error);
        return;
      }

      const created = "created" in result ? result.created : 0;
      const merged = "merged" in result ? result.merged : 0;

      toast.success(
        merged > 0
          ? `${created} added, ${merged} merged into existing items`
          : `${created} item${created === 1 ? "" : "s"} added to your shopping list`
      );

      onOpenChange(false);
      onAdded();
    } catch (err) {
      console.error("Failed to add ingredients:", err);
      setError("Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-[540px]">
        <DialogHeader>
          <DialogTitle className="text-xl">Add to shopping list</DialogTitle>
          <DialogDescription>
            Pick what you still need to buy for {recipe?.name}.
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-12 text-muted-foreground">
            <Loader2 className="mr-2 h-5 w-5 animate-spin" />
            Checking your list…
          </div>
        ) : ingredients.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">
            This recipe has no ingredients yet. Edit it to add some.
          </p>
        ) : (
          <div className="space-y-3">
            {linkedIngredients.length > 0 && (
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">
                  {selectedCount} of {linkedIngredients.length} selected
                </span>
                <Button type="button" variant="ghost" size="sm" onClick={toggleAll}>
                  {allSelected ? "Clear all" : "Select all"}
                </Button>
              </div>
            )}

            <div className="space-y-2">
              {ingredients.map((ingredient) => {
                const row = rows[ingredient.ingredientId];
                const selected = !!row?.selected;

                if (!ingredient.linked) {
                  return (
                    <div
                      key={ingredient.ingredientId}
                      className="flex items-start gap-3 rounded-lg border border-dashed p-3 opacity-70"
                    >
                      <Link2Off className="mt-0.5 h-4 w-4 flex-shrink-0 text-amber-500" />
                      <div className="min-w-0">
                        <p className="font-medium">{ingredient.rawName}</p>
                        <p className="text-xs text-muted-foreground">
                          Not linked to your catalog — edit the recipe to link it.
                        </p>
                      </div>
                    </div>
                  );
                }

                return (
                  <div
                    key={ingredient.ingredientId}
                    className={cn(
                      "rounded-lg border p-3 transition-colors",
                      selected && "border-primary bg-primary/5"
                    )}
                  >
                    <button
                      type="button"
                      onClick={() => toggleRow(ingredient.ingredientId)}
                      className="flex w-full items-start gap-3 text-left"
                    >
                      <span
                        className={cn(
                          "mt-0.5 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded border transition-colors",
                          selected
                            ? "border-primary bg-primary text-primary-foreground"
                            : "border-muted-foreground/40"
                        )}
                        aria-hidden
                      >
                        {selected && <Check className="h-3.5 w-3.5" />}
                      </span>

                      <span className="min-w-0 flex-1">
                        <span className="flex items-center gap-2">
                          {ingredient.categoryIcon ? (
                            <span className="text-sm">{ingredient.categoryIcon}</span>
                          ) : (
                            <span
                              className="h-2 w-2 rounded-full"
                              style={{
                                backgroundColor: ingredient.categoryColor || "#6366f1",
                              }}
                            />
                          )}
                          <span className="font-medium">{ingredient.listName}</span>
                        </span>

                        <span className="mt-0.5 block text-xs text-muted-foreground">
                          {ingredient.categoryName}
                          {ingredient.existingQuantity != null && (
                            <>
                              {" · "}
                              <span className="text-amber-600 dark:text-amber-500">
                                already on list ({ingredient.existingQuantity}
                                {ingredient.existingUnit ? ` ${ingredient.existingUnit}` : ""}
                                )
                              </span>
                            </>
                          )}
                        </span>
                      </span>
                    </button>

                    {selected && (
                      <div className="mt-2 flex gap-2 pl-8">
                        <Input
                          type="number"
                          inputMode="decimal"
                          min={0}
                          step="any"
                          placeholder="Qty"
                          value={row?.quantity ?? ""}
                          onChange={(e) =>
                            setRows((prev) => ({
                              ...prev,
                              [ingredient.ingredientId]: {
                                ...prev[ingredient.ingredientId],
                                quantity: e.target.value,
                              },
                            }))
                          }
                          className="h-10 w-24"
                        />
                        <Input
                          placeholder="Unit"
                          value={row?.unit ?? ""}
                          onChange={(e) =>
                            setRows((prev) => ({
                              ...prev,
                              [ingredient.ingredientId]: {
                                ...prev[ingredient.ingredientId],
                                unit: e.target.value,
                              },
                            }))
                          }
                          className="h-10 flex-1"
                          maxLength={50}
                        />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {unlinkedCount > 0 && (
              <p className="text-xs text-muted-foreground">
                {unlinkedCount} ingredient{unlinkedCount === 1 ? "" : "s"} can&apos;t be
                added until linked to your catalog.
              </p>
            )}
          </div>
        )}

        {error && <p className="text-sm text-destructive">{error}</p>}

        <DialogFooter>
          <Button
            onClick={handleSubmit}
            disabled={submitting || selectedCount === 0}
            size="lg"
            className="h-12 w-full"
          >
            {submitting ? (
              <Loader2 className="mr-2 h-5 w-5 animate-spin" />
            ) : (
              <ShoppingCart className="mr-2 h-5 w-5" />
            )}
            Add {selectedCount > 0 ? selectedCount : ""} to shopping list
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
