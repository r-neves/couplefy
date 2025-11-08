"use client";

import { useState, useEffect } from "react";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Currency, CURRENCY_NAMES } from "@/lib/utils/currency";

const CURRENCY_KEY = 'couplefy_currency';

export function useCurrency() {
  const [currency, setCurrencyState] = useState<Currency>('EUR');

  useEffect(() => {
    const stored = localStorage.getItem(CURRENCY_KEY);
    if (stored && (stored === 'EUR' || stored === 'GBP' || stored === 'USD')) {
      setCurrencyState(stored as Currency);
    }
  }, []);

  const setCurrency = (newCurrency: Currency) => {
    setCurrencyState(newCurrency);
    localStorage.setItem(CURRENCY_KEY, newCurrency);
    // Trigger a custom event to notify other components
    window.dispatchEvent(new CustomEvent('currencyChange', { detail: newCurrency }));
  };

  return { currency, setCurrency };
}

export function CurrencySettings() {
  const { currency, setCurrency } = useCurrency();

  return (
    <div className="space-y-2">
      <Label htmlFor="currency">Currency</Label>
      <Select value={currency} onValueChange={(value) => setCurrency(value as Currency)}>
        <SelectTrigger id="currency">
          <SelectValue placeholder="Select currency" />
        </SelectTrigger>
        <SelectContent>
          {Object.entries(CURRENCY_NAMES).map(([code, name]) => (
            <SelectItem key={code} value={code}>
              {name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
