"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus, X } from "lucide-react";
import { SavedItemCombobox, type ShoppingCategoryLite } from "./saved-item-combobox";
import type { CatalogItemDTO } from "@/app/dashboard/actions/shopping-list-actions";

export interface IngredientRow {
  savedItemId: string | null;
  rawName: string;
  quantity: string;
  unit: string;
}

export const EMPTY_INGREDIENT: IngredientRow = {
  savedItemId: null,
  rawName: "",
  quantity: "",
  unit: "",
};

interface IngredientRowsProps {
  rows: IngredientRow[];
  onChange: (rows: IngredientRow[]) => void;
  catalogItems: CatalogItemDTO[];
  shoppingCategories: ShoppingCategoryLite[];
  onCreateCatalogItem: (name: string, categoryId: string) => Promise<string | null>;
}

const MAX_INGREDIENTS = 60;

export function IngredientRows({
  rows,
  onChange,
  catalogItems,
  shoppingCategories,
  onCreateCatalogItem,
}: IngredientRowsProps) {
  const updateRow = (index: number, patch: Partial<IngredientRow>) => {
    onChange(rows.map((row, i) => (i === index ? { ...row, ...patch } : row)));
  };

  const removeRow = (index: number) => {
    onChange(rows.length === 1 ? [{ ...EMPTY_INGREDIENT }] : rows.filter((_, i) => i !== index));
  };

  const unlinkedCount = rows.filter(
    (row) => row.rawName.trim() && !row.savedItemId
  ).length;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <Label>Ingredients (optional)</Label>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => onChange([...rows, { ...EMPTY_INGREDIENT }])}
          disabled={rows.length >= MAX_INGREDIENTS}
        >
          <Plus className="mr-1 h-4 w-4" />
          Add ingredient
        </Button>
      </div>

      {shoppingCategories.length === 0 && (
        <p className="rounded-md border border-amber-300 bg-amber-50 p-2 text-xs text-amber-800 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-200">
          This board has no shopping categories yet, so ingredients can&apos;t be
          linked to the catalog. Create categories on the Shopping List page first.
        </p>
      )}

      <div className="space-y-3">
        {rows.map((row, index) => (
          <div key={index} className="rounded-lg border p-2">
            <div className="flex items-start gap-2">
              <div className="flex-1">
                <SavedItemCombobox
                  value={row.rawName}
                  savedItemId={row.savedItemId}
                  catalogItems={catalogItems}
                  shoppingCategories={shoppingCategories}
                  onCreateCatalogItem={onCreateCatalogItem}
                  onChange={(next) => updateRow(index, next)}
                />
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-11 w-11 flex-shrink-0 text-muted-foreground hover:text-destructive"
                onClick={() => removeRow(index)}
                aria-label="Remove ingredient"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            {row.rawName.trim() && (
              <div className="mt-2 flex gap-2">
                <Input
                  type="number"
                  inputMode="decimal"
                  min={0}
                  step="any"
                  placeholder="Qty"
                  value={row.quantity}
                  onChange={(e) => updateRow(index, { quantity: e.target.value })}
                  className="h-10 w-24"
                />
                <Input
                  placeholder="Unit (g, ml, pack)"
                  value={row.unit}
                  onChange={(e) => updateRow(index, { unit: e.target.value })}
                  className="h-10 flex-1"
                  maxLength={50}
                />
              </div>
            )}
          </div>
        ))}
      </div>

      {unlinkedCount > 0 && (
        <p className="text-xs text-muted-foreground">
          {unlinkedCount} ingredient{unlinkedCount === 1 ? "" : "s"} not linked to
          the catalog. Linked ones can be pushed to your shopping list.
        </p>
      )}
    </div>
  );
}
