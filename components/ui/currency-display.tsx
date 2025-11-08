"use client";

import { useEffect, useState } from "react";
import { formatCurrency, type Currency } from "@/lib/utils/currency";

const CURRENCY_KEY = 'couplefy_currency';

export function CurrencyDisplay({ amount, className }: { amount: number; className?: string }) {
  const [currency, setCurrency] = useState<Currency>('EUR');

  useEffect(() => {
    // Get initial currency from localStorage
    const stored = localStorage.getItem(CURRENCY_KEY);
    if (stored && (stored === 'EUR' || stored === 'GBP' || stored === 'USD')) {
      setCurrency(stored as Currency);
    }

    // Listen for currency changes
    const handleCurrencyChange = (event: Event) => {
      const customEvent = event as CustomEvent<Currency>;
      setCurrency(customEvent.detail);
    };

    window.addEventListener('currencyChange', handleCurrencyChange);
    return () => window.removeEventListener('currencyChange', handleCurrencyChange);
  }, []);

  return <span className={className}>{formatCurrency(amount, currency)}</span>;
}
