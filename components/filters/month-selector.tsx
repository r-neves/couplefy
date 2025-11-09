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
  const yearParam = searchParams.get("year");
  const monthParam = searchParams.get("month");
  const isAllTime = yearParam === "all";
  
  const year = isAllTime ? new Date().getFullYear() : parseInt(yearParam || new Date().getFullYear().toString());
  const month = isAllTime ? new Date().getMonth() + 1 : parseInt(monthParam || (new Date().getMonth() + 1).toString());

  const currentDate = new Date(year, month - 1);

  const handlePreviousMonth = () => {
    if (isAllTime) return;
    const prevMonth = new Date(currentDate);
    prevMonth.setMonth(prevMonth.getMonth() - 1);
    router.push(`${currentPath}?year=${prevMonth.getFullYear()}&month=${prevMonth.getMonth() + 1}`);
  };

  const handleNextMonth = () => {
    if (isAllTime || isCurrentMonth()) return;
    const nextMonth = new Date(currentDate);
    nextMonth.setMonth(nextMonth.getMonth() + 1);
    router.push(`${currentPath}?year=${nextMonth.getFullYear()}&month=${nextMonth.getMonth() + 1}`);
  };

  const handleCurrentMonth = () => {
    router.push(currentPath);
  };

  const handleAllTime = () => {
    router.push(`${currentPath}?year=all`);
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
        disabled={isAllTime}
      >
        <ChevronLeft className="h-4 w-4" />
      </Button>

      <div className="flex items-center gap-2">
        <span className="text-sm font-medium min-w-[120px] text-center">
          {isAllTime ? "All Time" : currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
        </span>
        {isAllTime ? (
          <Button
            variant="ghost"
            size="sm"
            onClick={handleCurrentMonth}
          >
            Monthly
          </Button>
        ) : (
          <>
            {!isCurrentMonth() && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleCurrentMonth}
              >
                Today
              </Button>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={handleAllTime}
            >
              All Time
            </Button>
          </>
        )}
      </div>

      <Button
        variant="outline"
        size="icon"
        onClick={handleNextMonth}
        disabled={isAllTime || isCurrentMonth()}
      >
        <ChevronRight className="h-4 w-4" />
      </Button>
    </div>
  );
}
