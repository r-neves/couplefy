"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Home,
  PiggyBank,
  Receipt,
  ShoppingCart,
  UtensilsCrossed,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  /** Matches the item's section, so nested routes stay highlighted. */
  isActive: (pathname: string) => boolean;
}

const NAV_ITEMS: NavItem[] = [
  {
    href: "/dashboard/expenses",
    label: "Expenses",
    icon: Receipt,
    isActive: (p) => p.startsWith("/dashboard/expenses"),
  },
  {
    href: "/dashboard/savings",
    label: "Savings",
    icon: PiggyBank,
    isActive: (p) => p.startsWith("/dashboard/savings"),
  },
  {
    href: "/dashboard",
    label: "Home",
    icon: Home,
    isActive: (p) => p === "/dashboard",
  },
  {
    href: "/dashboard/shopping-list",
    label: "Shopping",
    icon: ShoppingCart,
    isActive: (p) => p.startsWith("/dashboard/shopping-list"),
  },
  {
    href: "/dashboard/meal-planning",
    label: "Meals",
    icon: UtensilsCrossed,
    isActive: (p) => p.startsWith("/dashboard/meal-planning"),
  },
];

/**
 * Bottom tab bar for phones. Hidden from `md` up, where the in-page headers
 * already provide navigation. Sits above the safe-area inset so it clears the
 * home indicator when installed as a PWA.
 */
export function MobileNavBar() {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Main"
      className={cn(
        "fixed inset-x-0 bottom-0 z-40 md:hidden",
        "border-t bg-white/95 backdrop-blur-md dark:bg-gray-950/95"
      )}
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <ul className="flex items-stretch">
        {NAV_ITEMS.map(({ href, label, icon: Icon, isActive }) => {
          const active = isActive(pathname);

          return (
            <li key={href} className="flex-1">
              <Link
                href={href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex h-[4.5rem] flex-col items-center justify-center gap-1.5 px-1",
                  "transition-colors focus-visible:outline-none focus-visible:ring-2",
                  "focus-visible:ring-inset focus-visible:ring-ring",
                  active
                    ? "text-purple-600 dark:text-purple-400"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                <Icon
                  className={cn("h-6 w-6 shrink-0", active && "stroke-[2.5]")}
                  aria-hidden="true"
                />
                <span
                  className={cn(
                    "text-[11px] leading-none",
                    active ? "font-semibold" : "font-medium"
                  )}
                >
                  {label}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
