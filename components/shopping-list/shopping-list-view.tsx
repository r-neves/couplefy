"use client";

import { useState } from "react";
import { ItemRow } from "./item-row";
import { EditItemDialog } from "./edit-item-dialog";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { ChevronDown, ChevronRight } from "lucide-react";

interface ShoppingListViewProps {
  items: any[];
  categories: any[];
  onToggleItem: (id: string, completed: boolean) => void;
  onDeleteItem: (id: string) => void;
  onItemUpdated: () => void;
}

export function ShoppingListView({ items, categories, onToggleItem, onDeleteItem, onItemUpdated }: ShoppingListViewProps) {
  const [showCompleted, setShowCompleted] = useState(false);
  const [editingItem, setEditingItem] = useState<any | null>(null);
  const [collapsedCategories, setCollapsedCategories] = useState<Set<string>>(new Set());

  const toggleCategory = (categoryId: string) => {
    setCollapsedCategories(prev => {
      const newSet = new Set(prev);
      if (newSet.has(categoryId)) {
        newSet.delete(categoryId);
      } else {
        newSet.add(categoryId);
      }
      return newSet;
    });
  };

  // Group items by category
  const groupedItems = items.reduce((acc, item) => {
    const catId = item.category_id;
    if (!acc[catId]) {
      acc[catId] = [];
    }
    acc[catId].push(item);
    return acc;
  }, {} as Record<string, any[]>);

  // Sorting categories?
  // We can sort categories by name or usage? Let's use the order provided in props (name asc).
  
  // Filter visible categories
  const visibleCategories = categories.filter(category => {
    const categoryItems = groupedItems[category.id] || [];
    
    // If showCompleted is true, show category if it has any items
    if (showCompleted) {
        return categoryItems.length > 0;
    }

    // If showCompleted is false, show category ONLY if it has remaining active items
    const hasActiveItems = categoryItems.some((i: any) => !i.completed);
    return hasActiveItems;
  });

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex items-center space-x-3 p-3 sm:p-2 bg-muted/30 rounded-lg">
        <input
          type="checkbox"
          id="show-completed"
          checked={showCompleted}
          onChange={(e) => setShowCompleted(e.target.checked)}
          className="h-5 w-5 sm:h-4 sm:w-4 accent-primary cursor-pointer"
        />
        <Label htmlFor="show-completed" className="cursor-pointer text-base sm:text-sm font-medium">Show Completed</Label>
      </div>

      <div className="space-y-4 sm:space-y-6">
        {visibleCategories.length === 0 && (
            <div className="text-center py-10 text-muted-foreground">
                {items.length === 0 
                  ? "Your shopping list is empty." 
                  : (showCompleted ? "No items found." : "All items checked! Toggle 'Show Completed' to see them.")}
            </div>
        )}

        {visibleCategories.map(category => {
          const categoryItems = groupedItems[category.id] || [];
          const visibleItems = showCompleted 
            ? categoryItems 
            : categoryItems.filter((i: any) => !i.completed);
          
          // Sort items alphabetically by name
          const sortedItems = [...visibleItems].sort((a, b) => 
            a.name.toLowerCase().localeCompare(b.name.toLowerCase())
          );
            
          if (sortedItems.length === 0) return null;

          const isCollapsed = collapsedCategories.has(category.id);

          return (
            <div key={category.id} className="space-y-3">
              <button
                onClick={() => toggleCategory(category.id)}
                className="flex items-center gap-2 w-full text-left hover:opacity-70 transition-opacity"
              >
                {isCollapsed ? (
                  <ChevronRight className="h-5 w-5 flex-shrink-0" />
                ) : (
                  <ChevronDown className="h-5 w-5 flex-shrink-0" />
                )}
                {category.icon ? (
                  <span className="text-lg">{category.icon}</span>
                ) : (
                  <div
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: category.color || "#6366f1" }}
                  />
                )}
                <h3 className="font-semibold text-lg">{category.name}</h3>
                <span className="text-sm text-muted-foreground ml-auto">
                  {sortedItems.length} {sortedItems.length === 1 ? 'item' : 'items'}
                </span>
              </button>
              {!isCollapsed && (
                <div className="space-y-2">
                  {sortedItems.map((item: any) => (
                    <ItemRow
                      key={item.id}
                      item={item}
                      onToggle={onToggleItem}
                      onDelete={onDeleteItem}
                      onEdit={(item) => setEditingItem(item)}
                    />
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {editingItem && (
        <EditItemDialog
          item={editingItem}
          categories={categories}
          open={!!editingItem}
          onOpenChange={(open) => !open && setEditingItem(null)}
          onItemUpdated={() => {
            setEditingItem(null);
            onItemUpdated();
          }}
        />
      )}
    </div>
  );
}
