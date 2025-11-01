"use client";

import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";

interface MonthSelectorProps {
  currentPath: string;
}

export function MonthSelector({ currentPath }: MonthSelectorProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Get current month from search params or default to current month
  const year = parseInt(searchParams.get("year") || new Date().getFullYear().toString());
  const month = parseInt(searchParams.get("month") || (new Date().getMonth() + 1).toString());

  const currentDate = new Date(year, month - 1);

  const handlePreviousMonth = () => {
    const prevMonth = new Date(currentDate);
    prevMonth.setMonth(prevMonth.getMonth() - 1);
    router.push(`${currentPath}?year=${prevMonth.getFullYear()}&month=${prevMonth.getMonth() + 1}`);
  };

  const handleNextMonth = () => {
    const nextMonth = new Date(currentDate);
    nextMonth.setMonth(nextMonth.getMonth() + 1);
    router.push(`${currentPath}?year=${nextMonth.getFullYear()}&month=${nextMonth.getMonth() + 1}`);
  };

  const handleCurrentMonth = () => {
    router.push(currentPath);
  };

  const isCurrentMonth = () => {
    const now = new Date();
    return year === now.getFullYear() && month === (now.getMonth() + 1);
  };

  return (
    <div className="flex items-center gap-2">
      <Button
        variant="outline"
        size="icon"
        onClick={handlePreviousMonth}
      >
        <ChevronLeft className="h-4 w-4" />
      </Button>

      <div className="flex items-center gap-2">
        <span className="text-sm font-medium min-w-[120px] text-center">
          {currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
        </span>
        {!isCurrentMonth() && (
          <Button
            variant="ghost"
            size="sm"
            onClick={handleCurrentMonth}
          >
            Today
          </Button>
        )}
      </div>

      <Button
        variant="outline"
        size="icon"
        onClick={handleNextMonth}
      >
        <ChevronRight className="h-4 w-4" />
      </Button>
    </div>
  );
}
