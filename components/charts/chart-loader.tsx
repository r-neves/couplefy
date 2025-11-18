'use client';

import dynamic from 'next/dynamic';
import { Skeleton } from '@/components/ui/skeleton';

// Loading component for charts
function ChartSkeleton({ height = 'h-64' }: { height?: string }) {
  return (
    <div className={`w-full ${height} animate-pulse`}>
      <Skeleton className="w-full h-full" />
    </div>
  );
}

// Dynamically import chart components with code splitting
// This reduces the initial bundle size significantly (~200KB saved)
export const CategoryBreakdownChart = dynamic(
  () => import('./category-breakdown-chart').then(mod => ({ default: mod.CategoryBreakdownChart })),
  {
    loading: () => <ChartSkeleton height="h-[300px]" />,
    ssr: false, // Don't render charts on server (saves bundle size)
  }
);

export const PersonBreakdownChart = dynamic(
  () => import('./person-breakdown-chart').then(mod => ({ default: mod.PersonBreakdownChart })),
  {
    loading: () => <ChartSkeleton height="h-64" />,
    ssr: false,
  }
);

export const ExpenseComparisonChart = dynamic(
  () => import('./expense-comparison-chart').then(mod => ({ default: mod.ExpenseComparisonChart })),
  {
    loading: () => <ChartSkeleton height="h-64" />,
    ssr: false,
  }
);
