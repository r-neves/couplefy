"use client";

import { useEffect, useState } from "react";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from "chart.js";
import { Line } from "react-chartjs-2";
import ChartDataLabels from 'chartjs-plugin-datalabels';
import { getCurrencySymbol, isSymbolAfter, type Currency } from "@/lib/utils/currency";

const CURRENCY_KEY = 'couplefy_currency';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler,
  ChartDataLabels
);

interface MonthlyData {
  month: string;
  personal: number;
  shared: number;
}

interface MonthlyTrendChartProps {
  data: MonthlyData[];
}

export function MonthlyTrendChart({ data }: MonthlyTrendChartProps) {
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

  const isDark = typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches;

  const chartData = {
    labels: data.map((item) => item.month),
    datasets: [
      {
        label: "Personal",
        data: data.map((item) => item.personal),
        borderColor: "rgb(99, 102, 241)",
        backgroundColor: "rgba(99, 102, 241, 0.1)",
        tension: 0.4,
        fill: true,
      },
      {
        label: "Shared",
        data: data.map((item) => item.shared),
        borderColor: "rgb(236, 72, 153)",
        backgroundColor: "rgba(236, 72, 153, 0.1)",
        tension: 0.4,
        fill: true,
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
        display: function(context: any) {
          // Only show labels for the last point of each dataset
          return context.dataIndex === context.dataset.data.length - 1;
        },
        align: 'top' as const,
        color: function(context: any) {
          return context.dataset.borderColor;
        },
        font: {
          weight: 'bold' as const,
          size: 12,
        },
        formatter: (value: number) => {
          return symbolAfter ? `${value.toFixed(0)}${currencySymbol}` : `${currencySymbol}${value.toFixed(0)}`;
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
      <Line data={chartData} options={options} />
    </div>
  );
}
