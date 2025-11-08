"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { EditSavingDialog } from "./edit-saving-dialog";
import { DeleteSavingDialog } from "./delete-saving-dialog";
import { Pencil, Trash2 } from "lucide-react";

interface Category {
  id: string;
  name: string;
  color: string | null;
  type: string;
  icon?: string | null;
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
  members: Array<{
    user: {
      id: string;
      name: string;
    };
  }>;
}

interface User {
  id: string;
  name: string;
}

interface Saving {
  id: string;
  amount: string;
  categoryId: string;
  description: string | null;
  date: Date;
  groupId: string | null;
  userId: string;
  category: Category;
  group: Group | null;
  user: User;
}

interface SavingsListProps {
  savings: Saving[];
  categories: Array<{
    id: string;
    name: string;
    color: string;
    type: string;
    groupId: string | null;
  }>;
  groups: Array<{
    id: string;
    name: string;
  }>;
  groupsWithMembers: GroupWithMembers[];
  currentUserId: string;
}

export function SavingsList({
  savings,
  categories,
  groups,
  groupsWithMembers,
  currentUserId,
}: SavingsListProps) {
  const [editingSaving, setEditingSaving] = useState<Saving | null>(null);
  const [deletingSaving, setDeletingSaving] = useState<Saving | null>(null);

  return (
    <>
      {savings.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          <p>No savings recorded this month</p>
          <p className="text-sm mt-2">Click "Add Saving" to get started</p>
        </div>
      ) : (
        <div className="space-y-4">
          {savings.map((saving) => (
            <div
              key={saving.id}
              className="flex items-center justify-between p-4 rounded-lg border"
            >
              <div className="flex items-center gap-4 flex-1">
                <div
                  className="w-10 h-10 rounded-full flex items-center justify-center text-white font-semibold"
                  style={{ backgroundColor: saving.category.color || "#6366f1" }}
                >
                  {saving.category.icon || saving.category.name.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1">
                  <p className="font-medium">{saving.category.name}</p>
                  {saving.description && (
                    <p className="text-sm text-muted-foreground">{saving.description}</p>
                  )}
                  <p className="text-xs text-muted-foreground mt-1">
                    {new Date(saving.date).toLocaleDateString()}
                    {saving.group && ` • ${saving.group.name}`}
                    {saving.user && ` • Saved by ${saving.user.name}`}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <div className="text-right mr-2">
                  <p className="text-lg font-semibold">${parseFloat(saving.amount).toFixed(2)}</p>
                  {saving.groupId && (
                    <p className="text-xs text-muted-foreground">Shared</p>
                  )}
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setEditingSaving(saving)}
                >
                  <Pencil className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setDeletingSaving(saving)}
                >
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {editingSaving && (
        <EditSavingDialog
          saving={editingSaving}
          categories={categories}
          groups={groups}
          groupsWithMembers={groupsWithMembers}
          currentUserId={currentUserId}
          open={!!editingSaving}
          onOpenChange={(open) => !open && setEditingSaving(null)}
        />
      )}

      {deletingSaving && (
        <DeleteSavingDialog
          savingId={deletingSaving.id}
          savingDescription={deletingSaving.description || deletingSaving.category.name}
          open={!!deletingSaving}
          onOpenChange={(open) => !open && setDeletingSaving(null)}
        />
      )}
    </>
  );
}
