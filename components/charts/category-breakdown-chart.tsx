"use client";

import { useEffect, useState } from "react";
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from "chart.js";
import { Doughnut } from "react-chartjs-2";
import ChartDataLabels from 'chartjs-plugin-datalabels';
import { getCurrencySymbol, isSymbolAfter, type Currency } from "@/lib/utils/currency";

ChartJS.register(ArcElement, Tooltip, Legend, ChartDataLabels);

const CURRENCY_KEY = 'couplefy_currency';

interface CategoryData {
  name: string;
  total: number;
  color: string;
}

interface CategoryBreakdownChartProps {
  data: CategoryData[];
}

export function CategoryBreakdownChart({ data }: CategoryBreakdownChartProps) {
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
      <div className="flex items-center justify-center h-[300px] text-muted-foreground">
        No data available
      </div>
    );
  }

  const chartData = {
    labels: data.map((item) => item.name),
    datasets: [
      {
        data: data.map((item) => item.total),
        backgroundColor: data.map((item) => item.color),
        borderColor: data.map((item) => item.color),
        borderWidth: 1,
      },
    ],
  };

  const isDark = typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches;

  const total = data.reduce((sum, item) => sum + item.total, 0);

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: "bottom" as const,
        labels: {
          padding: 15,
          font: {
            size: 12,
          },
          color: isDark ? '#e5e7eb' : '#374151',
        },
      },
      tooltip: {
        callbacks: {
          label: function (context: any) {
            const label = context.label || "";
            const value = context.parsed || 0;
            const total = context.dataset.data.reduce((a: number, b: number) => a + b, 0);
            const percentage = ((value / total) * 100).toFixed(1);
            const formattedValue = symbolAfter ? `${value.toFixed(2)}${currencySymbol}` : `${currencySymbol}${value.toFixed(2)}`;
            return `${label}: ${formattedValue} (${percentage}%)`;
          },
        },
      },
      datalabels: {
        color: '#fff',
        font: {
          weight: 'bold' as const,
          size: 13,
        },
        formatter: (value: number, context: any) => {
          const percentage = ((value / total) * 100);
          // Only show label if slice is larger than 5% to avoid clutter
          if (percentage <= 5) return '';
          return symbolAfter ? `${value.toFixed(0)}${currencySymbol}` : `${currencySymbol}${value.toFixed(0)}`;
        },
      },
    },
  };

  return (
    <div className="h-[300px]">
      <Doughnut data={chartData} options={options} />
    </div>
  );
}
