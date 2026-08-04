"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Check, Link2Off, Loader2, Plus } from "lucide-react";
import { savedItemMatches, savedItemMatchesExactly } from "@/lib/utils/saved-items";
import type { CatalogItemDTO } from "@/app/dashboard/actions/shopping-list-actions";
import { cn } from "@/lib/utils";

interface SavedItemComboboxProps {
  /** What the recipe calls this ingredient. */
  value: string;
  /** Catalog entry this ingredient resolves to, if any. */
  savedItemId: string | null;
  catalogItems: CatalogItemDTO[];
  onChange: (next: { rawName: string; savedItemId: string | null }) => void;
  /** Create a catalog entry for `name`; resolves to its new id, or null on failure. */
  onCreateCatalogItem: (name: string, categoryId: string) => Promise<string | null>;
  /** Shopping categories of this board — a new catalog entry needs one. */
  shoppingCategories: ShoppingCategoryLite[];
  placeholder?: string;
}

export interface ShoppingCategoryLite {
  id: string;
  name: string;
  color: string | null;
  icon: string | null;
}

const MAX_SUGGESTIONS = 6;

export function SavedItemCombobox({
  value,
  savedItemId,
  catalogItems,
  onChange,
  onCreateCatalogItem,
  shoppingCategories,
  placeholder = "e.g., bacalhau",
}: SavedItemComboboxProps) {
  const [open, setOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [showCategoryPicker, setShowCategoryPicker] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const linkedItem = useMemo(
    () => catalogItems.find((item) => item.id === savedItemId) ?? null,
    [catalogItems, savedItemId]
  );

  const suggestions = useMemo(() => {
    if (!value.trim()) return [];
    return catalogItems
      .filter((item) => savedItemMatches(item.names, value))
      .slice(0, MAX_SUGGESTIONS);
  }, [catalogItems, value]);

  // Only offer to create when nothing in the catalog already answers to this name.
  const hasExactMatch = useMemo(
    () => catalogItems.some((item) => savedItemMatchesExactly(item.names, value)),
    [catalogItems, value]
  );

  const showCreateOption =
    shoppingCategories.length > 0 && !!value.trim() && !hasExactMatch && !savedItemId;

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false);
        setShowCategoryPicker(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const selectItem = (item: CatalogItemDTO) => {
    onChange({ rawName: item.displayName, savedItemId: item.id });
    setOpen(false);
    setShowCategoryPicker(false);
  };

  const handleCreate = async (categoryId: string) => {
    setCreating(true);
    try {
      const newId = await onCreateCatalogItem(value.trim(), categoryId);
      if (newId) {
        onChange({ rawName: value.trim(), savedItemId: newId });
        setOpen(false);
        setShowCategoryPicker(false);
      }
    } finally {
      setCreating(false);
    }
  };

  return (
    <div ref={containerRef} className="relative">
      <Input
        value={value}
        placeholder={placeholder}
        // Editing the name breaks the catalog link — it no longer describes
        // the item that was chosen.
        onChange={(e) => {
          onChange({ rawName: e.target.value, savedItemId: null });
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        className={cn("h-11 pr-9", linkedItem && "border-emerald-400 dark:border-emerald-700")}
        maxLength={255}
      />

      <div className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2">
        {creating ? (
          <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
        ) : linkedItem ? (
          <Check className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
        ) : value.trim() ? (
          <Link2Off className="h-4 w-4 text-amber-500" />
        ) : null}
      </div>

      {linkedItem && (
        <p className="mt-1 flex items-center gap-1 text-xs text-emerald-700 dark:text-emerald-400">
          {linkedItem.categoryIcon ? (
            <span>{linkedItem.categoryIcon}</span>
          ) : (
            <span
              className="inline-block h-2 w-2 rounded-full"
              style={{ backgroundColor: linkedItem.categoryColor || "#6366f1" }}
            />
          )}
          Linked to “{linkedItem.displayName}” in {linkedItem.categoryName ?? "catalog"}
        </p>
      )}

      {!linkedItem && value.trim() && (
        <p className="mt-1 text-xs text-amber-600 dark:text-amber-500">
          Not linked — won&apos;t be added to the shopping list.
        </p>
      )}

      {open && (suggestions.length > 0 || showCreateOption) && (
        <div className="absolute z-50 mt-1 w-full overflow-hidden rounded-lg border bg-popover shadow-lg">
          {suggestions.length > 0 && (
            <div className="max-h-56 overflow-y-auto p-1">
              {suggestions.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => selectItem(item)}
                  className="flex w-full items-center gap-2 rounded-md p-2 text-left text-sm transition-colors hover:bg-accent"
                >
                  {item.categoryIcon ? (
                    <span className="text-base">{item.categoryIcon}</span>
                  ) : (
                    <span
                      className="h-2.5 w-2.5 flex-shrink-0 rounded-full"
                      style={{ backgroundColor: item.categoryColor || "#6366f1" }}
                    />
                  )}
                  <span className="truncate font-medium">{item.displayName}</span>
                  <span className="ml-auto flex-shrink-0 text-xs text-muted-foreground">
                    {item.categoryName}
                  </span>
                </button>
              ))}
            </div>
          )}

          {showCreateOption && (
            <div className="border-t p-1">
              {!showCategoryPicker ? (
                <Button
                  type="button"
                  variant="ghost"
                  className="h-auto w-full justify-start py-2 text-sm"
                  onClick={() => setShowCategoryPicker(true)}
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Add “{value.trim()}” to the catalog
                </Button>
              ) : (
                <div className="space-y-2 p-2">
                  <p className="text-xs text-muted-foreground">
                    Which shopping aisle does “{value.trim()}” belong to?
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {shoppingCategories.map((category) => (
                      <button
                        key={category.id}
                        type="button"
                        disabled={creating}
                        onClick={() => handleCreate(category.id)}
                        className="inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs transition-colors hover:bg-accent disabled:opacity-50"
                      >
                        {category.icon ? (
                          <span>{category.icon}</span>
                        ) : (
                          <span
                            className="h-2 w-2 rounded-full"
                            style={{ backgroundColor: category.color || "#6366f1" }}
                          />
                        )}
                        {category.name}
                      </button>
                    ))}
                  </div>
                  {creating && (
                    <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <Loader2 className="h-3 w-3 animate-spin" />
                      Adding to catalog…
                    </p>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
