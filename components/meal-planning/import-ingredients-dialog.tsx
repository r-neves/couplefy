"use client";

import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Check, ClipboardPaste, Link2Off } from "lucide-react";
import { parseIngredientText } from "@/lib/recipes/importers/parse-ingredients";
import { matchToCatalog } from "@/lib/recipes/importers/match-catalog";
import type { CatalogItemDTO } from "@/app/dashboard/actions/shopping-list-actions";
import type { IngredientRow } from "./ingredient-rows";
import { cn } from "@/lib/utils";

interface ImportIngredientsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  catalogItems: CatalogItemDTO[];
  onImport: (rows: IngredientRow[]) => void;
}

const PLACEHOLDER = `400 g de bacalhau demolhado
2 dentes de alho
1 cebola, em quartos
200 ml de leite
sal q.b.`;

export function ImportIngredientsDialog({
  open,
  onOpenChange,
  catalogItems,
  onImport,
}: ImportIngredientsDialogProps) {
  const [text, setText] = useState("");
  const [skipped, setSkipped] = useState<Set<number>>(new Set());

  useEffect(() => {
    if (!open) return;
    setText("");
    setSkipped(new Set());
  }, [open]);

  const parsed = useMemo(() => {
    return parseIngredientText(text).map((ingredient) => ({
      ...ingredient,
      match: matchToCatalog(ingredient.name, catalogItems),
    }));
  }, [text, catalogItems]);

  const selectedCount = parsed.length - skipped.size;
  const matchedCount = parsed.filter(
    (p, index) => !skipped.has(index) && p.match.savedItemId
  ).length;

  const toggle = (index: number) => {
    setSkipped((prev) => {
      const next = new Set(prev);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });
  };

  const handleImport = () => {
    const rows: IngredientRow[] = parsed
      .filter((_, index) => !skipped.has(index))
      .map((ingredient) => ({
        // Keep what the recipe calls it; the link is carried by savedItemId.
        savedItemId: ingredient.match.savedItemId,
        rawName: ingredient.name,
        quantity: ingredient.quantity != null ? String(ingredient.quantity) : "",
        unit: ingredient.unit ?? "",
      }));

    onImport(rows);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-[560px]">
        <DialogHeader>
          <DialogTitle className="text-xl">Import ingredients</DialogTitle>
          <DialogDescription>
            Paste the ingredient list from Cookidoo or any recipe page — one per
            line. Quantities, units and known items are picked up automatically.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <Textarea
            value={text}
            onChange={(e) => {
              setText(e.target.value);
              setSkipped(new Set());
            }}
            placeholder={PLACEHOLDER}
            rows={6}
            className="font-mono text-sm"
          />

          {parsed.length > 0 && (
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">
                {selectedCount} ingredient{selectedCount === 1 ? "" : "s"} ·{" "}
                {matchedCount} matched to your catalog
              </p>

              <div className="max-h-[280px] space-y-1.5 overflow-y-auto">
                {parsed.map((ingredient, index) => {
                  const included = !skipped.has(index);
                  const linked = !!ingredient.match.savedItemId;

                  return (
                    <button
                      key={index}
                      type="button"
                      onClick={() => toggle(index)}
                      className={cn(
                        "flex w-full items-start gap-3 rounded-lg border p-2.5 text-left transition-colors",
                        included ? "hover:bg-accent/50" : "opacity-50"
                      )}
                    >
                      <span
                        className={cn(
                          "mt-0.5 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded border",
                          included
                            ? "border-primary bg-primary text-primary-foreground"
                            : "border-muted-foreground/40"
                        )}
                        aria-hidden
                      >
                        {included && <Check className="h-3.5 w-3.5" />}
                      </span>

                      <span className="min-w-0 flex-1">
                        <span className="flex flex-wrap items-baseline gap-x-2">
                          {ingredient.quantity != null && (
                            <span className="text-sm tabular-nums text-muted-foreground">
                              {Math.round(ingredient.quantity * 1000) / 1000}
                              {ingredient.unit ? ` ${ingredient.unit}` : ""}
                            </span>
                          )}
                          <span className="font-medium">{ingredient.name}</span>
                        </span>

                        <span
                          className={cn(
                            "mt-0.5 flex items-center gap-1 text-xs",
                            linked
                              ? "text-emerald-700 dark:text-emerald-400"
                              : "text-amber-600 dark:text-amber-500"
                          )}
                        >
                          {linked ? (
                            <>
                              <Check className="h-3 w-3" />
                              {ingredient.match.confidence === "exact"
                                ? `Matched “${ingredient.match.matchedName}”`
                                : `Probably “${ingredient.match.matchedName}”`}
                            </>
                          ) : (
                            <>
                              <Link2Off className="h-3 w-3" />
                              Not in your catalog — you can link it after importing
                            </>
                          )}
                        </span>
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {text.trim() && parsed.length === 0 && (
            <p className="text-sm text-muted-foreground">
              Nothing recognised yet — make sure each ingredient is on its own line.
            </p>
          )}
        </div>

        <DialogFooter>
          <Button
            onClick={handleImport}
            disabled={selectedCount === 0}
            size="lg"
            className="h-12 w-full"
          >
            <ClipboardPaste className="mr-2 h-5 w-5" />
            Add {selectedCount > 0 ? selectedCount : ""} ingredient
            {selectedCount === 1 ? "" : "s"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
