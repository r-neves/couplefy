"use client";

import { useEffect, useRef, useState } from "react";
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
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2, Plus, X } from "lucide-react";
import {
  createRecipeFromClient,
  updateRecipeFromClient,
  type RecipeDTO,
} from "@/app/dashboard/actions/recipes-actions";
import type { RecipeCategoryDTO } from "@/app/dashboard/actions/recipe-categories-actions";
import {
  createSavedItemFromClient,
  type CatalogItemDTO,
} from "@/app/dashboard/actions/shopping-list-actions";
import { detectSourceType } from "@/lib/recipes/source";
import {
  IngredientRows,
  EMPTY_INGREDIENT,
  type IngredientRow,
} from "./ingredient-rows";
import type { ShoppingCategoryLite } from "./saved-item-combobox";

interface LinkRow {
  url: string;
  label: string;
}

interface RecipeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  categories: RecipeCategoryDTO[];
  groupId?: string;
  /** Omit to create a new recipe. */
  recipe?: RecipeDTO | null;
  /** Saved-items catalog for this board, for linking ingredients. */
  catalogItems: CatalogItemDTO[];
  shoppingCategories: ShoppingCategoryLite[];
  onSuccess?: () => void;
  /** Called after a catalog entry is created, so the parent can refetch. */
  onCatalogItemCreated?: () => void;
}

const EMPTY_LINK: LinkRow = { url: "", label: "" };

export function RecipeDialog({
  open,
  onOpenChange,
  categories,
  groupId,
  recipe,
  catalogItems,
  shoppingCategories,
  onSuccess,
  onCatalogItemCreated,
}: RecipeDialogProps) {
  const isEditing = !!recipe;

  const [name, setName] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [servings, setServings] = useState("");
  const [notes, setNotes] = useState("");
  const [links, setLinks] = useState<LinkRow[]>([{ ...EMPTY_LINK }]);
  const [ingredients, setIngredients] = useState<IngredientRow[]>([
    { ...EMPTY_INGREDIENT },
  ]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Read inside the reset effect without making it depend on identity — see below.
  const categoriesRef = useRef(categories);
  categoriesRef.current = categories;

  // Reset the form when the dialog opens or switches recipe, so a stale edit
  // never leaks into the next one.
  //
  // The dependencies are deliberately narrow: `recipe` and `categories` get new
  // object identities on every router.refresh(), and refreshes happen while this
  // dialog is open (creating a catalog entry triggers one). Depending on them
  // would wipe whatever the user has typed. Keying on recipe?.id means a refresh
  // of the same recipe leaves the in-progress edit alone.
  useEffect(() => {
    if (!open) return;

    const currentCategories = categoriesRef.current;

    setError(null);
    setName(recipe?.name ?? "");
    setCategoryId(
      recipe?.categoryId ??
        (currentCategories.length === 1 ? currentCategories[0].id : "")
    );
    setServings(recipe?.servings != null ? String(recipe.servings) : "");
    setNotes(recipe?.notes ?? "");
    setLinks(
      recipe?.links.length
        ? recipe.links.map((link) => ({ url: link.url, label: link.label ?? "" }))
        : [{ ...EMPTY_LINK }]
    );
    setIngredients(
      recipe?.ingredients.length
        ? recipe.ingredients.map((ingredient) => ({
            savedItemId: ingredient.savedItemId,
            rawName: ingredient.rawName,
            quantity: ingredient.quantity != null ? String(ingredient.quantity) : "",
            unit: ingredient.unit ?? "",
          }))
        : [{ ...EMPTY_INGREDIENT }]
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, recipe?.id]);

  /**
   * Create a catalog entry on the fly while authoring, so an unknown ingredient
   * does not force a detour to the shopping list page.
   */
  const handleCreateCatalogItem = async (
    itemName: string,
    shoppingCategoryId: string
  ): Promise<string | null> => {
    try {
      const result = await createSavedItemFromClient(
        { default: itemName },
        shoppingCategoryId,
        groupId
      );

      if ("error" in result && result.error) {
        setError(result.error);
        return null;
      }

      onCatalogItemCreated?.();
      return "savedItemId" in result ? (result.savedItemId as string) : null;
    } catch (err) {
      console.error("Failed to create catalog item:", err);
      setError("Couldn't add that to the catalog.");
      return null;
    }
  };

  const updateLink = (index: number, patch: Partial<LinkRow>) => {
    setLinks((prev) => prev.map((link, i) => (i === index ? { ...link, ...patch } : link)));
  };

  const removeLink = (index: number) => {
    setLinks((prev) => (prev.length === 1 ? [{ ...EMPTY_LINK }] : prev.filter((_, i) => i !== index)));
  };

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);

    if (!name.trim() || !categoryId) {
      setError("Name and category are required");
      return;
    }

    const parsedServings = servings.trim() ? Number(servings) : null;
    if (parsedServings != null && (!Number.isInteger(parsedServings) || parsedServings < 1)) {
      setError("Servings must be a whole number");
      return;
    }

    setLoading(true);

    try {
      const input = {
        name: name.trim(),
        categoryId,
        servings: parsedServings,
        notes: notes.trim() || null,
        links: links
          .filter((link) => link.url.trim())
          .map((link) => ({ url: link.url.trim(), label: link.label.trim() || null })),
        ingredients: ingredients
          .filter((ingredient) => ingredient.rawName.trim())
          .map((ingredient) => ({
            savedItemId: ingredient.savedItemId,
            rawName: ingredient.rawName.trim(),
            quantity: ingredient.quantity.trim() ? Number(ingredient.quantity) : null,
            unit: ingredient.unit.trim() || null,
          })),
        groupId: groupId || null,
      };

      if (input.ingredients.some((i) => i.quantity != null && !Number.isFinite(i.quantity))) {
        setError("Ingredient quantities must be numbers");
        return;
      }

      const result = isEditing
        ? await updateRecipeFromClient(recipe.id, input)
        : await createRecipeFromClient(input);

      if ("error" in result && result.error) {
        setError(result.error);
        return;
      }

      onOpenChange(false);
      onSuccess?.();
    } catch (err) {
      console.error("Failed to save recipe:", err);
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-[540px]">
        <DialogHeader>
          <DialogTitle className="text-xl">
            {isEditing ? "Edit Recipe" : "New Recipe"}
          </DialogTitle>
          <DialogDescription>
            {isEditing
              ? "Update this recipe's details and links."
              : `Add a recipe to your ${groupId ? "group" : "personal"} library.`}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="space-y-2">
            <Label htmlFor="recipe-name">Name</Label>
            <Input
              id="recipe-name"
              placeholder="e.g., Bacalhau à Brás"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="h-12 text-base"
              required
            />
          </div>

          <div className="space-y-2">
            <Label>Type</Label>
            <Select value={categoryId} onValueChange={setCategoryId}>
              <SelectTrigger className="h-12 text-base">
                <SelectValue placeholder="Select a type" />
              </SelectTrigger>
              <SelectContent>
                {categories.map((category) => (
                  <SelectItem key={category.id} value={category.id} className="h-12">
                    <div className="flex items-center gap-2">
                      {category.icon ? (
                        <span className="text-lg">{category.icon}</span>
                      ) : (
                        <div
                          className="h-3 w-3 rounded-full"
                          style={{ backgroundColor: category.color || "#6366f1" }}
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
            <Label htmlFor="recipe-servings">Servings (optional)</Label>
            <Input
              id="recipe-servings"
              type="number"
              inputMode="numeric"
              min={1}
              max={99}
              placeholder="e.g., 4"
              value={servings}
              onChange={(e) => setServings(e.target.value)}
              className="h-12 text-base"
            />
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Links (optional)</Label>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setLinks((prev) => [...prev, { ...EMPTY_LINK }])}
                disabled={links.length >= 10}
              >
                <Plus className="mr-1 h-4 w-4" />
                Add link
              </Button>
            </div>

            <div className="space-y-3">
              {links.map((link, index) => {
                const sourceType = link.url.trim() ? detectSourceType(link.url.trim()) : null;

                return (
                  <div key={index} className="flex items-start gap-2">
                    <div className="flex-1 space-y-2">
                      <Input
                        placeholder="https://cookidoo.pt/recipes/..."
                        value={link.url}
                        onChange={(e) => updateLink(index, { url: e.target.value })}
                        className="h-11 text-base"
                        inputMode="url"
                      />
                      {link.url.trim() && (
                        <div className="flex items-center gap-2">
                          <Input
                            placeholder="Label (optional)"
                            value={link.label}
                            onChange={(e) => updateLink(index, { label: e.target.value })}
                            className="h-10"
                            maxLength={100}
                          />
                          {sourceType === "cookidoo" && (
                            <span className="whitespace-nowrap rounded-md bg-emerald-100 px-2 py-1 text-xs text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-200">
                              Cookidoo
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-11 w-11 flex-shrink-0 text-muted-foreground hover:text-destructive"
                      onClick={() => removeLink(index)}
                      aria-label="Remove link"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                );
              })}
            </div>
          </div>

          <IngredientRows
            rows={ingredients}
            onChange={setIngredients}
            catalogItems={catalogItems}
            shoppingCategories={shoppingCategories}
            onCreateCatalogItem={handleCreateCatalogItem}
          />

          <div className="space-y-2">
            <Label htmlFor="recipe-notes">Notes (optional)</Label>
            <Textarea
              id="recipe-notes"
              placeholder="e.g., double the garlic, needs 2h marinating"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              maxLength={5000}
            />
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}

          <DialogFooter>
            <Button
              type="submit"
              size="lg"
              className="h-12 w-full"
              disabled={loading || !name.trim() || !categoryId}
            >
              {loading && <Loader2 className="mr-2 h-5 w-5 animate-spin" />}
              {isEditing ? "Save Changes" : "Create Recipe"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
