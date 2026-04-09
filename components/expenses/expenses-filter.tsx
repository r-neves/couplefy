"use client";

import { useState, useMemo } from "react";
import { ExpensesList } from "./expenses-list";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface Category {
  id: string;
  name: string;
  color: string;
  groupId: string | null;
}

interface Group {
  id: string;
  name: string;
}

interface GroupWithMembers {
  id: string;
  name: string;
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
  members: Array<{ user: { id: string; name: string } }>;
}

interface Expense {
  id: string;
  amount: string;
  categoryId: string;
  description: string | null;
  date: Date;
  groupId: string | null;
  userId: string;
  category: { id: string; name: string; color: string | null; icon?: string | null };
  group: { id: string; name: string } | null;
  user: { id: string; name: string };
}

interface ExpensesFilterProps {
  expenses: Expense[];
  categories: Category[];
  groups: Group[];
  groupsWithMembers: GroupWithMembers[];
  currentUserId: string;
}

export function ExpensesFilter({
  expenses,
  categories,
  groups,
  groupsWithMembers,
  currentUserId,
}: ExpensesFilterProps) {
  const [source, setSource] = useState<string>("all");
  const [categoryId, setCategoryId] = useState<string>("all");
  const [description, setDescription] = useState<string>("");
  const [amountMin, setAmountMin] = useState<string>("");
  const [amountMax, setAmountMax] = useState<string>("");

  // Categories available given the selected source
  const availableCategories = useMemo(() => {
    if (source === "all") return categories;
    if (source === "personal") return categories.filter(c => c.groupId === null);
    return categories.filter(c => c.groupId === source);
  }, [source, categories]);

  // Reset category when source changes and the current selection is no longer valid
  const handleSourceChange = (value: string) => {
    setSource(value);
    setCategoryId("all");
  };

  const filtered = useMemo(() => {
    return expenses.filter(expense => {
      // Source filter
      if (source === "personal" && expense.groupId !== null) return false;
      if (source !== "all" && source !== "personal" && expense.groupId !== source) return false;

      // Category filter
      if (categoryId !== "all" && expense.categoryId !== categoryId) return false;

      // Description filter
      if (
        description.trim() !== "" &&
        !expense.description?.toLowerCase().includes(description.trim().toLowerCase())
      ) {
        return false;
      }

      // Amount range filter
      const amount = parseFloat(expense.amount);
      if (amountMin !== "" && amount < parseFloat(amountMin)) return false;
      if (amountMax !== "" && amount > parseFloat(amountMax)) return false;

      return true;
    });
  }, [expenses, source, categoryId, description, amountMin, amountMax]);

  return (
    <div className="space-y-6">
      {/* Filter panel */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 p-4 rounded-lg border bg-white/50 dark:bg-gray-900/50 backdrop-blur-sm border-pink-200 dark:border-pink-800/50">
        {/* Source */}
        <div className="space-y-1.5">
          <Label htmlFor="source-filter">Source</Label>
          <Select value={source} onValueChange={handleSourceChange}>
            <SelectTrigger id="source-filter">
              <SelectValue placeholder="All" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="personal">Personal</SelectItem>
              {groups.map(group => (
                <SelectItem key={group.id} value={group.id}>{group.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Category */}
        <div className="space-y-1.5">
          <Label htmlFor="category-filter">Category</Label>
          <Select value={categoryId} onValueChange={setCategoryId}>
            <SelectTrigger id="category-filter">
              <SelectValue placeholder="All" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              {availableCategories.map(cat => (
                <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Description */}
        <div className="space-y-1.5">
          <Label htmlFor="description-filter">Description</Label>
          <Input
            id="description-filter"
            placeholder="Search description..."
            value={description}
            onChange={e => setDescription(e.target.value)}
          />
        </div>

        {/* Amount range */}
        <div className="space-y-1.5">
          <Label>Amount Range</Label>
          <div className="flex items-center gap-2">
            <Input
              type="number"
              placeholder="Min"
              value={amountMin}
              onChange={e => setAmountMin(e.target.value)}
              min={0}
            />
            <span className="text-muted-foreground text-sm">–</span>
            <Input
              type="number"
              placeholder="Max"
              value={amountMax}
              onChange={e => setAmountMax(e.target.value)}
              min={0}
            />
          </div>
        </div>
      </div>

      {/* Filtered results */}
      <ExpensesList
        expenses={filtered}
        categories={categories}
        groups={groups}
        groupsWithMembers={groupsWithMembers}
        currentUserId={currentUserId}
      />
    </div>
  );
}
