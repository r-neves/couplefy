"use client";

import { useEffect, useState } from "react";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from "chart.js";
import { Bar } from "react-chartjs-2";
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

interface ExpenseComparisonChartProps {
  personalTotal: number;
  sharedTotal: number;
}

export function ExpenseComparisonChart({
  personalTotal,
  sharedTotal,
}: ExpenseComparisonChartProps) {
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

  const isDark = typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches;

  const chartData = {
    labels: ["This Month"],
    datasets: [
      {
        label: "Personal",
        data: [personalTotal],
        backgroundColor: "rgba(99, 102, 241, 0.8)",
        borderColor: "rgb(99, 102, 241)",
        borderWidth: 1,
      },
      {
        label: "Shared",
        data: [sharedTotal],
        backgroundColor: "rgba(236, 72, 153, 0.8)",
        borderColor: "rgb(236, 72, 153)",
        borderWidth: 1,
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: "top" as const,
        labels: {
          color: isDark ? '#e5e7eb' : '#374151',
        },
      },
      tooltip: {
        callbacks: {
          label: function (context: any) {
            let label = context.dataset.label || "";
            if (label) {
              label += ": ";
            }
            const formattedValue = symbolAfter 
              ? `${context.parsed.y.toFixed(2)}${currencySymbol}` 
              : `${currencySymbol}${context.parsed.y.toFixed(2)}`;
            label += formattedValue;
            return label;
          },
        },
      },
      datalabels: {
        anchor: 'end' as const,
        align: 'top' as const,
        color: isDark ? '#e5e7eb' : '#374151',
        font: {
          weight: 'bold' as const,
          size: 13,
        },
        formatter: (value: number) => {
          return symbolAfter ? `${value.toFixed(2)}${currencySymbol}` : `${currencySymbol}${value.toFixed(2)}`;
        },
      },
    },
    scales: {
      y: {
        beginAtZero: true,
        ticks: {
          color: isDark ? '#9ca3af' : '#6b7280',
          callback: function (value: any) {
            return symbolAfter ? `${value}${currencySymbol}` : `${currencySymbol}${value}`;
          },
        },
        grid: {
          color: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)',
        },
      },
      x: {
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
    <div className="h-[300px]">
      <Bar data={chartData} options={options} />
    </div>
  );
}
