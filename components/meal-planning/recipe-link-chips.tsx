"use client";

import { ExternalLink } from "lucide-react";
import { cn } from "@/lib/utils";
import type { RecipeLinkDTO } from "@/app/dashboard/actions/recipes-actions";

interface RecipeLinkChipsProps {
  links: RecipeLinkDTO[];
  className?: string;
}

export function RecipeLinkChips({ links, className }: RecipeLinkChipsProps) {
  if (links.length === 0) return null;

  return (
    <div className={cn("flex flex-wrap gap-1.5", className)}>
      {links.map((link) => (
        <a
          key={link.id}
          href={link.url}
          target="_blank"
          rel="noopener noreferrer"
          // Stop the click bubbling into a card-level handler.
          onClick={(e) => e.stopPropagation()}
          className={cn(
            "inline-flex max-w-full items-center gap-1 rounded-md border px-2 py-1 text-xs transition-colors",
            link.sourceType === "cookidoo"
              ? "border-emerald-300 bg-emerald-50 text-emerald-800 hover:bg-emerald-100 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-200"
              : "hover:bg-accent"
          )}
        >
          <ExternalLink className="h-3 w-3 flex-shrink-0" />
          <span className="truncate">
            {link.label || (link.sourceType === "cookidoo" ? "Cookidoo" : "Recipe")}
          </span>
        </a>
      ))}
    </div>
  );
}
