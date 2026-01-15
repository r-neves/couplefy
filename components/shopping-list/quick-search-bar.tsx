"use client";

import { useState, useMemo, useRef, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Search, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface QuickSearchBarProps {
  savedItems: any[];
  categories: any[];
  currentItems: any[];
  onItemSelected: (savedItemId: string, existingItem?: any) => Promise<void>;
  disabled?: boolean;
}

// Helper function to normalize text by removing accents/diacritics
const normalizeText = (text: string): string => {
  return text
    .normalize('NFD') // Normalize to decomposed form (separates base characters from diacritics)
    .replace(/[\u0300-\u036f]/g, '') // Remove diacritical marks
    .toLowerCase();
};

export function QuickSearchBar({
  savedItems,
  categories,
  currentItems,
  onItemSelected,
  disabled = false
}: QuickSearchBarProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [showDropdown, setShowDropdown] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Check if an item is already in the shopping list (regardless of completion status)
  const findExistingItem = (displayName: string) => {
    return currentItems.find(
      item => item.name.toLowerCase() === displayName.toLowerCase()
    );
  };

  // Filter saved items by searching across all language names
  const filteredItems = useMemo(() => {
    if (!searchQuery.trim()) return [];

    const normalizedQuery = normalizeText(searchQuery);
    return savedItems.filter(item => {
      const namesObj = item.names as Record<string, string>;
      return Object.values(namesObj).some(name =>
        normalizeText(name).includes(normalizedQuery)
      );
    }).map(item => {
      const namesObj = item.names as Record<string, string>;
      const displayName = namesObj.default || Object.values(namesObj)[0] || "Unknown";
      const existingItem = findExistingItem(displayName);
      return {
        ...item,
        displayName,
        existingItem,
        alreadyInList: !!existingItem
      };
    });
  }, [savedItems, searchQuery, currentItems]);

  // Show dropdown when there's a query and filtered results
  useEffect(() => {
    setShowDropdown(searchQuery.trim().length > 0);
    setSelectedIndex(0);
  }, [searchQuery]);

  // Click outside to close dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node) &&
        inputRef.current &&
        !inputRef.current.contains(event.target as Node)
      ) {
        setShowDropdown(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!showDropdown || filteredItems.length === 0) return;

    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        setSelectedIndex(prev =>
          prev < filteredItems.length - 1 ? prev + 1 : prev
        );
        break;
      case "ArrowUp":
        e.preventDefault();
        setSelectedIndex(prev => (prev > 0 ? prev - 1 : 0));
        break;
      case "Enter":
        e.preventDefault();
        if (filteredItems[selectedIndex]) {
          handleSelectItem(
            filteredItems[selectedIndex].id,
            filteredItems[selectedIndex].existingItem
          );
        }
        break;
      case "Escape":
        e.preventDefault();
        setShowDropdown(false);
        inputRef.current?.blur();
        break;
    }
  };

  const handleSelectItem = async (savedItemId: string, existingItem?: any) => {
    setLoading(true);
    try {
      await onItemSelected(savedItemId, existingItem);
      // Clear search and close dropdown on success
      setSearchQuery("");
      setShowDropdown(false);
      inputRef.current?.blur();
    } catch (error) {
      console.error("Failed to add item:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative w-full">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
        <Input
          ref={inputRef}
          type="text"
          placeholder="Search items to add (e.g., milk, bread)..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={() => searchQuery.trim() && setShowDropdown(true)}
          disabled={disabled || loading}
          className="pl-10 h-12 text-base"
        />
        {loading && (
          <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-5 w-5 animate-spin text-muted-foreground" />
        )}
      </div>

      {/* Dropdown */}
      {showDropdown && (
        <div
          ref={dropdownRef}
          className="absolute z-50 w-full mt-2 bg-popover border rounded-lg shadow-lg max-h-[300px] overflow-y-auto"
        >
          {filteredItems.length > 0 ? (
            <div className="p-1">
              {filteredItems.map((item, index) => {
                const category = categories.find(c => c.id === item.category_id);
                const existingItem = item.existingItem;
                const isInListNotCompleted = existingItem && !existingItem.completed;
                const isInListCompleted = existingItem && existingItem.completed;

                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => handleSelectItem(item.id, item.existingItem)}
                    disabled={isInListNotCompleted}
                    className={cn(
                      "w-full text-left p-3 rounded-md transition-colors flex items-center justify-between group",
                      isInListNotCompleted
                        ? "opacity-50 cursor-not-allowed"
                        : index === selectedIndex
                        ? "bg-accent"
                        : "hover:bg-accent/50"
                    )}
                  >
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      {category?.icon ? (
                        <span className="text-lg flex-shrink-0">{category.icon}</span>
                      ) : (
                        <div
                          className="w-3 h-3 rounded-full flex-shrink-0"
                          style={{ backgroundColor: category?.color || "#6366f1" }}
                        />
                      )}
                      <span className={cn(
                        "font-medium truncate",
                        isInListNotCompleted && "line-through"
                      )}>
                        {item.displayName}
                      </span>
                      {isInListNotCompleted && (
                        <span className="text-xs text-muted-foreground">(Already in list)</span>
                      )}
                    </div>
                    <span className="text-sm text-muted-foreground ml-2 flex-shrink-0">
                      {category?.name}
                    </span>
                  </button>
                );
              })}
            </div>
          ) : (
            <div className="p-6 text-center text-muted-foreground">
              <p className="text-sm">No items found.</p>
              <p className="text-xs mt-1">Use 'Create Item' to add new ones.</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
