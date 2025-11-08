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

interface PersonSpending {
  name: string;
  total: number;
  color?: string;
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

  const chartData = {
    labels: data.map((item) => item.name),
    datasets: [
      {
        label: "Amount Spent",
        data: data.map((item) => item.total),
        backgroundColor: data.map((item, index) => {
          const colors = ['rgba(99, 102, 241, 0.8)', 'rgba(236, 72, 153, 0.8)', 'rgba(139, 92, 246, 0.8)'];
          return item.color || colors[index % colors.length];
        }),
        borderColor: data.map((item, index) => {
          const colors = ['rgb(99, 102, 241)', 'rgb(236, 72, 153)', 'rgb(139, 92, 246)'];
          return item.color || colors[index % colors.length];
        }),
        borderWidth: 1,
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false,
      },
      tooltip: {
        callbacks: {
          label: function (context: any) {
            const formattedValue = symbolAfter 
              ? `${context.parsed.y.toFixed(2)}${currencySymbol}` 
              : `${currencySymbol}${context.parsed.y.toFixed(2)}`;
            return formattedValue;
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
    <div className="h-64">
      <Bar data={chartData} options={options} />
    </div>
  );
}
