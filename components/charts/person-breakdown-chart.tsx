"use client";

import { useEffect, useState } from "react";
import { Bar } from "react-chartjs-2";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from "chart.js";
import ChartDataLabels from 'chartjs-plugin-datalabels';
import { getCurrencySymbol, isSymbolAfter, type Currency } from "@/lib/utils/currency";

const CURRENCY_KEY = 'couplefy_currency';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ChartDataLabels
);

interface CategorySpending {
  id: string;
  name: string;
  color: string;
  total: number;
}

interface PersonSpending {
  name: string;
  categories: CategorySpending[];
}

interface PersonBreakdownChartProps {
  data: PersonSpending[];
}

export function PersonBreakdownChart({ data }: PersonBreakdownChartProps) {
  const [currencySymbol, setCurrencySymbol] = useState('€');
  const [symbolAfter, setSymbolAfter] = useState(true);

  useEffect(() => {
    const stored = localStorage.getItem(CURRENCY_KEY);
    const currency = (stored && (stored === 'EUR' || stored === 'GBP' || stored === 'USD') ? stored : 'EUR') as Currency;
    setCurrencySymbol(getCurrencySymbol(currency));
    setSymbolAfter(isSymbolAfter(currency));

    const handleCurrencyChange = (event: Event) => {
      const customEvent = event as CustomEvent<Currency>;
      setCurrencySymbol(getCurrencySymbol(customEvent.detail));
      setSymbolAfter(isSymbolAfter(customEvent.detail));
    };

    window.addEventListener('currencyChange', handleCurrencyChange);
    return () => window.removeEventListener('currencyChange', handleCurrencyChange);
  }, []);

  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 text-muted-foreground">
        No data available
      </div>
    );
  }

  const isDark = typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches;

  // Collect all unique categories across all people
  const categoryMap = new Map<string, { name: string; color: string }>();
  for (const person of data) {
    for (const cat of person.categories) {
      if (!categoryMap.has(cat.id)) {
        categoryMap.set(cat.id, { name: cat.name, color: cat.color });
      }
    }
  }
  const allCategories = Array.from(categoryMap.entries());

  // Totals per person for the top label
  const personTotals = data.map(p => p.categories.reduce((sum, c) => sum + c.total, 0));

  const datasets = allCategories.map(([catId, cat], datasetIndex) => {
    const isLastCategory = (personIndex: number) => {
      // Find the last dataset that has a non-zero value for this person
      const personCatIds = new Set(data[personIndex].categories.map(c => c.id));
      const lastIndex = allCategories.reduce((last, [id], idx) => personCatIds.has(id) ? idx : last, -1);
      return datasetIndex === lastIndex;
    };

    return {
      label: cat.name,
      data: data.map(person => {
        const match = person.categories.find(c => c.id === catId);
        return match ? match.total : 0;
      }),
      backgroundColor: cat.color.startsWith('rgba') ? cat.color : `${cat.color}cc`,
      borderColor: cat.color.startsWith('rgb') ? cat.color : cat.color,
      borderWidth: 1,
      datalabels: {
        display: (context: any) => isLastCategory(context.dataIndex) && personTotals[context.dataIndex] > 0,
        anchor: 'end' as const,
        align: 'top' as const,
        color: isDark ? '#e5e7eb' : '#374151',
        font: {
          weight: 'bold' as const,
          size: 13,
        },
        formatter: (_value: number, context: any) => {
          const total = personTotals[context.dataIndex];
          return symbolAfter ? `${total.toFixed(2)}${currencySymbol}` : `${currencySymbol}${total.toFixed(2)}`;
        },
      },
    };
  });

  const chartData = {
    labels: data.map(p => p.name),
    datasets,
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: true,
        position: 'bottom' as const,
        labels: {
          color: isDark ? '#9ca3af' : '#6b7280',
          boxWidth: 12,
          padding: 12,
        },
      },
      tooltip: {
        callbacks: {
          label: function (context: any) {
            const value = context.parsed.y;
            if (value === 0) return null;
            const formatted = symbolAfter
              ? `${value.toFixed(2)}${currencySymbol}`
              : `${currencySymbol}${value.toFixed(2)}`;
            return `${context.dataset.label}: ${formatted}`;
          },
        },
      },
      datalabels: {},
    },
    scales: {
      y: {
        stacked: true,
        beginAtZero: true,
        ticks: {
          callback: function (value: any) {
            return symbolAfter ? `${value}${currencySymbol}` : `${currencySymbol}${value}`;
          },
          color: isDark ? '#9ca3af' : '#6b7280',
        },
        grid: {
          color: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)',
        },
      },
      x: {
        stacked: true,
        ticks: {
          color: isDark ? '#9ca3af' : '#6b7280',
        },
        grid: {
          color: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)',
        },
      },
    },
  };

  return (
    <div className="h-72 w-full max-w-full overflow-hidden">
      <Bar data={chartData} options={options as any} />
    </div>
  );
}
