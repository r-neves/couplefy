"use client";

import { useState, useTransition, useEffect } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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
import { ShoppingListView } from "./shopping-list-view";
import { AddItemDialog } from "./add-item-dialog";
import { ManageShoppingCategories } from "./manage-shopping-categories";
import { ManageSavedItems } from "./manage-saved-items";
import { QuickSearchBar } from "./quick-search-bar";
import { toggleShoppingItemFromClient, deleteShoppingItemFromClient, createShoppingListItemFromClient, clearShoppingListFromClient } from "@/app/dashboard/actions/shopping-list-actions";
import { useRouter } from "next/navigation";
import { Users, User, RefreshCw, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface ShoppingListMainProps {
  userId: string;
  userGroups: any[];
  initialPersonalItems: any[];
  initialPersonalCategories: any[];
  initialGroupData: { groupId: string; items: any[]; categories: any[] }[];
  initialSavedItems: any[];
}

interface ViewData {
  items: any[];
  categories: any[];
}

export function ShoppingListMain({
  userId,
  userGroups,
  initialPersonalItems,
  initialPersonalCategories,
  initialGroupData,
  initialSavedItems
}: ShoppingListMainProps) {
  const STORAGE_KEY = 'shopping-list-last-view';
  
  // Initialize activeView from localStorage or default to "personal"
  const [activeView, setActiveView] = useState(() => {
    if (typeof window === 'undefined') return "personal";
    
    try {
      const savedView = localStorage.getItem(STORAGE_KEY);
      if (savedView) {
        // Validate that the saved view still exists
        const validGroupIds = userGroups.map(g => g.id);
        if (savedView === "personal" || validGroupIds.includes(savedView)) {
          return savedView;
        }
      }
    } catch (error) {
      console.error("Failed to load saved view:", error);
    }
    return "personal";
  });
  
  const [isPending, startTransition] = useTransition();
  const [showClearAlert, setShowClearAlert] = useState(false);
  const router = useRouter();
  
  // We keep a local cache of items to handle optimistic updates
  // Note: simpler to just rely on initial props + router.refresh() for real sync, 
  // but for toggle we want instant feedback.
  
  // Flatten data for easier access
  const [data, setData] = useState<Record<string, ViewData>>({
    personal: { items: initialPersonalItems, categories: initialPersonalCategories },
    ...initialGroupData.reduce((acc, g) => ({
      ...acc,
      [g.groupId]: { items: g.items, categories: g.categories }
    }), {} as Record<string, ViewData>)
  });

  // Save activeView to localStorage whenever it changes
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, activeView);
    } catch (error) {
      console.error("Failed to save view preference:", error);
    }
  }, [activeView]);

  // Sync with props when they change (server revalidation)
  useEffect(() => {
     setData({
        personal: { items: initialPersonalItems, categories: initialPersonalCategories },
        ...initialGroupData.reduce((acc, g) => ({
        ...acc,
        [g.groupId]: { items: g.items, categories: g.categories }
        }), {} as Record<string, ViewData>)
    });
  }, [initialPersonalItems, initialPersonalCategories, initialGroupData]);

  const currentData = data[activeView] || { items: [], categories: [] };

  const handleToggleItem = async (itemId: string, completed: boolean) => {
    // Optimistic update
    const previousItems = [...currentData.items];
    const updatedItems = previousItems.map(item => 
        item.id === itemId ? { ...item, completed } : item
    );
    
    setData(prev => ({
        ...prev,
        [activeView]: { ...prev[activeView], items: updatedItems }
    }));

    try {
      const result = await toggleShoppingItemFromClient(itemId, completed);
      if (result.error) throw new Error(result.error);
      // Server revalidation happens automatically via action revalidatePath
      // But we need to refresh router to pull new props if we want 100% sync
      // Ideally we don't await router.refresh() for toggle to prevent UI stutter
    } catch (error) {
      // Revert optimistic update
       setData(prev => ({
        ...prev,
        [activeView]: { ...prev[activeView], items: previousItems }
       }));
       console.error("Failed to update item");
    }
  };

  const handleDeleteItem = async (itemId: string) => {
    const previousItems = [...currentData.items];
    const updatedItems = previousItems.filter(item => item.id !== itemId);

     setData(prev => ({
        ...prev,
        [activeView]: { ...prev[activeView], items: updatedItems }
    }));

    try {
      const result = await deleteShoppingItemFromClient(itemId);
      if (result.error) throw new Error(result.error);
    } catch (error) {
       setData(prev => ({
        ...prev,
        [activeView]: { ...prev[activeView], items: previousItems }
       }));
       console.error("Failed to delete item");
    }
  };

  const handleQuickAddFromSearch = async (savedItemId: string, existingItem?: any) => {
    // If item exists and is completed, uncheck it instead of creating duplicate
    if (existingItem && existingItem.completed) {
      await handleToggleItem(existingItem.id, false);
      return;
    }

    // If item exists and is not completed, do nothing (shouldn't happen due to UI disable)
    if (existingItem && !existingItem.completed) {
      return;
    }

    // Find the saved item
    const savedItem = initialSavedItems.find(i => i.id === savedItemId);
    if (!savedItem) return;

    // Get display name (first available language)
    const namesObj = savedItem.names as Record<string, string>;
    const displayName = namesObj.default || Object.values(namesObj)[0] || "Unknown";

    // Optimistic update
    const tempItem = {
      id: `temp-${Date.now()}`,
      name: displayName,
      quantity: 1,
      unit: null,
      category_id: savedItem.category_id,
      completed: false,
      shopping_categories: savedItem.shopping_categories
    };

    const previousItems = [...currentData.items];
    setData(prev => ({
      ...prev,
      [activeView]: {
        ...prev[activeView],
        items: [tempItem, ...prev[activeView].items]
      }
    }));

    // Create actual item
    try {
      const formData = new FormData();
      formData.append("name", displayName);
      formData.append("quantity", "1");
      formData.append("unit", "");
      formData.append("categoryId", savedItem.category_id);
      if (activeView !== "personal") formData.append("groupId", activeView);

      const result = await createShoppingListItemFromClient(formData);
      if (result.error) throw new Error(result.error);

      router.refresh(); // Sync with server
    } catch (error) {
      // Revert optimistic update
      setData(prev => ({
        ...prev,
        [activeView]: { ...prev[activeView], items: previousItems }
      }));
      console.error("Failed to add item");
    }
  };

  const handleClearList = async () => {
    const previousItems = [...currentData.items];
    // Optimistic update - clear all items
    setData(prev => ({
      ...prev,
      [activeView]: { ...prev[activeView], items: [] }
    }));

    try {
      const result = await clearShoppingListFromClient(activeView === "personal" ? undefined : activeView);
      if (result.error) throw new Error(result.error);
      router.refresh();
    } catch (error) {
      // Revert optimistic update
      setData(prev => ({
        ...prev,
        [activeView]: { ...prev[activeView], items: previousItems }
      }));
      console.error("Failed to clear shopping list");
    }
  };

  const handleRefresh = () => {
    startTransition(() => {
        router.refresh();
    });
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* View Selector */}
      <div className="flex flex-col gap-3">
        <div className="flex items-center gap-2 bg-muted/50 p-1.5 rounded-lg overflow-x-auto">
           <Button
             variant={activeView === "personal" ? "secondary" : "ghost"}
             size="default"
             onClick={() => setActiveView("personal")}
             className="gap-2 whitespace-nowrap h-11"
           >
             <User className="h-4 w-4" /> Personal
           </Button>
           {userGroups.map(group => (
              <Button
                key={group.id}
                variant={activeView === group.id ? "secondary" : "ghost"}
                size="default"
                onClick={() => setActiveView(group.id)}
                className="gap-2 whitespace-nowrap h-11"
              >
                <Users className="h-4 w-4" /> {group.name}
              </Button>
           ))}
        </div>

        <QuickSearchBar
          savedItems={initialSavedItems}
          categories={currentData.categories}
          currentItems={currentData.items}
          onItemSelected={handleQuickAddFromSearch}
        />

        <div className="flex items-center gap-2 flex-wrap">
            <ManageShoppingCategories
              categories={currentData.categories}
              userId={userId}
              groupId={activeView === "personal" ? undefined : activeView}
            />
            <ManageSavedItems
              savedItems={initialSavedItems}
              categories={currentData.categories}
            />
            <Button
              variant="outline"
              size="default"
              onClick={handleRefresh}
              disabled={isPending}
              className="h-11 shrink-0"
            >
                <RefreshCw className={cn("h-4 w-4 sm:mr-2", isPending && "animate-spin")} />
                <span className="hidden sm:inline">Refresh</span>
            </Button>
            <Button
              variant="outline"
              size="default"
              onClick={() => setShowClearAlert(true)}
              disabled={currentData.items.length === 0}
              className="h-11 shrink-0 text-destructive hover:text-destructive"
            >
                <Trash2 className="h-4 w-4 sm:mr-2" />
                <span className="hidden sm:inline">Clear List</span>
            </Button>
            <AddItemDialog
                userId={userId}
                groupId={activeView === "personal" ? undefined : activeView}
                categories={currentData.categories}
                onItemAdded={() => {
                   router.refresh();
                }}
            />
        </div>
      </div>

      <Card className="bg-white/50 dark:bg-gray-900/50 backdrop-blur-sm border-green-200 dark:border-green-800/50 min-h-[400px]">
         <CardHeader>
           <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2">
             <div>
                <CardTitle className="text-lg sm:text-xl">{activeView === "personal" ? "Personal Shopping List" : 
                    userGroups.find(g => g.id === activeView)?.name + " Shopping List"
                }</CardTitle>
                <CardDescription className="text-sm">
                    {currentData.items.filter((i: any) => !i.completed).length} items remaining
                </CardDescription>
             </div>
           </div>
         </CardHeader>
         <CardContent>
            <ShoppingListView 
                items={currentData.items} 
                categories={currentData.categories}
                onToggleItem={handleToggleItem}
                onDeleteItem={handleDeleteItem}
                onItemUpdated={() => router.refresh()}
            />
         </CardContent>
      </Card>

      <AlertDialog open={showClearAlert} onOpenChange={setShowClearAlert}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Clear Shopping List?</AlertDialogTitle>
            <AlertDialogDescription>
              This will remove all items from your {activeView === "personal" ? "personal" : "group"} shopping list. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                setShowClearAlert(false);
                handleClearList();
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Clear List
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
