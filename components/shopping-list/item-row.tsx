"use client";

import { Button } from "@/components/ui/button";
import { Trash2, Edit2 } from "lucide-react";
import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";

interface ItemRowProps {
  item: any; // detailed type would be better but keeping it flexible for now
  onToggle: (id: string, completed: boolean) => void;
  onDelete: (id: string) => void;
  onEdit?: (item: any) => void;
}

export function ItemRow({ item, onToggle, onDelete, onEdit }: ItemRowProps) {
  const [isHovered, setIsHovered] = useState(false);
  const [isTouchDevice, setIsTouchDevice] = useState(false);

  useEffect(() => {
    // Check if device supports hover (i.e., not a touch device)
    setIsTouchDevice(window.matchMedia('(hover: none)').matches);
  }, []);

  return (
    <div
      className={cn(
        "flex items-center justify-between px-3 py-2 rounded-lg border bg-card text-card-foreground shadow-sm transition-all duration-200",
        item.completed && "opacity-50 bg-muted/50"
      )}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div className="flex items-center gap-3 sm:gap-3 flex-1 overflow-hidden min-w-0">
        <input
          type="checkbox"
          checked={item.completed}
          onChange={(e) => onToggle(item.id, e.target.checked)}
          className="h-6 w-6 sm:h-5 sm:w-5 accent-primary flex-shrink-0 cursor-pointer"
        />
        <div className="flex flex-col overflow-hidden min-w-0">
          <span
            className={cn(
              "font-medium truncate transition-all text-base sm:text-sm",
              item.completed && "line-through text-muted-foreground"
            )}
          >
            {item.name}
          </span>
          {(item.quantity > 1 || item.unit) && (
            <span className="text-sm sm:text-xs text-muted-foreground">
              {item.quantity > 1 ? Number(item.quantity) : ""} {item.unit}
            </span>
          )}
        </div>
      </div>

      <div className={cn("flex items-center gap-1 transition-opacity", isHovered || isTouchDevice ? "opacity-100" : "opacity-0")}>
        {onEdit && (
            <Button
            variant="ghost"
            size="icon"
            className="h-10 w-10 sm:h-8 sm:w-8 text-muted-foreground hover:text-primary"
            onClick={() => onEdit(item)}
            >
            <Edit2 className="h-5 w-5 sm:h-4 sm:w-4" />
            <span className="sr-only">Edit</span>
            </Button>
        )}
        <Button
          variant="ghost"
          size="icon"
          className="h-10 w-10 sm:h-8 sm:w-8 text-muted-foreground hover:text-destructive"
          onClick={() => onDelete(item.id)}
        >
          <Trash2 className="h-5 w-5 sm:h-4 sm:w-4" />
          <span className="sr-only">Delete</span>
        </Button>
      </div>
    </div>
  );
}
