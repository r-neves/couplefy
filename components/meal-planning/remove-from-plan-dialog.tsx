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
import { Check, Loader2 } from "lucide-react";
import type { RemovalCandidate } from "@/app/dashboard/actions/recipe-shopping-actions";
import type { RecipeDTO } from "@/app/dashboard/actions/recipes-actions";
import { cn } from "@/lib/utils";

interface RemoveFromPlanDialogProps {
  recipe: RecipeDTO | null;
  candidates: RemovalCandidate[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (itemIdsToRemove: string[]) => Promise<void>;
}

export function RemoveFromPlanDialog({
  recipe,
  candidates,
  open,
  onOpenChange,
  onConfirm,
}: RemoveFromPlanDialogProps) {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [submitting, setSubmitting] = useState(false);

  // Pre-check everything this recipe alone put on the list. Items another
  // planned recipe also needs start unchecked — removing those would break
  // that other recipe's shopping.
  useEffect(() => {
    if (!open) return;
    setSelected(
      new Set(
        candidates
          .filter((candidate) => candidate.alsoUsedBy === 0)
          .map((candidate) => candidate.itemId)
      )
    );
  }, [open, candidates]);

  const toggle = (itemId: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(itemId)) next.delete(itemId);
      else next.add(itemId);
      return next;
    });
  };

  const handleConfirm = async () => {
    setSubmitting(true);
    try {
      await onConfirm([...selected]);
      onOpenChange(false);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Remove “{recipe?.name}” from the plan?</DialogTitle>
          <DialogDescription>
            These unbought items came from this recipe. Untick anything you want to
            keep on your shopping list.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2 py-2">
          {candidates.map((candidate) => {
            const isSelected = selected.has(candidate.itemId);

            return (
              <button
                key={candidate.itemId}
                type="button"
                onClick={() => toggle(candidate.itemId)}
                className={cn(
                  "flex w-full items-start gap-3 rounded-lg border p-3 text-left transition-colors",
                  isSelected ? "border-destructive/60 bg-destructive/5" : "hover:bg-accent/50"
                )}
              >
                <span
                  className={cn(
                    "mt-0.5 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded border transition-colors",
                    isSelected
                      ? "border-destructive bg-destructive text-destructive-foreground"
                      : "border-muted-foreground/40"
                  )}
                  aria-hidden
                >
                  {isSelected && <Check className="h-3.5 w-3.5" />}
                </span>

                <span className="min-w-0 flex-1">
                  <span className="font-medium">{candidate.name}</span>
                  <span className="ml-2 text-sm text-muted-foreground">
                    {candidate.quantity}
                    {candidate.unit ? ` ${candidate.unit}` : ""}
                  </span>
                  {candidate.alsoUsedBy > 0 && (
                    <span className="mt-0.5 block text-xs text-amber-600 dark:text-amber-500">
                      Also needed by {candidate.alsoUsedBy} other planned recipe
                      {candidate.alsoUsedBy === 1 ? "" : "s"}
                    </span>
                  )}
                </span>
              </button>
            );
          })}
        </div>

        <DialogFooter className="flex-col gap-2 sm:flex-row">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={submitting}
            className="w-full sm:w-auto"
          >
            Cancel
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={submitting}
            className="w-full bg-destructive text-destructive-foreground hover:bg-destructive/90 sm:w-auto"
          >
            {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {selected.size > 0
              ? `Remove recipe and ${selected.size} item${selected.size === 1 ? "" : "s"}`
              : "Remove recipe only"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
