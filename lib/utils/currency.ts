export type Currency = 'EUR' | 'GBP' | 'USD';

export const CURRENCY_SYMBOLS: Record<Currency, string> = {
  EUR: '€',
  GBP: '£',
  USD: '$',
};

export const CURRENCY_NAMES: Record<Currency, string> = {
  EUR: 'Euro (€)',
  GBP: 'Pound (£)',
  USD: 'Dollar ($)',
};

// Currencies where symbol comes after the value
const SYMBOL_AFTER_CURRENCIES: Currency[] = ['EUR'];

export function formatCurrency(amount: number, currency: Currency = 'EUR'): string {
  const symbol = CURRENCY_SYMBOLS[currency];
  const formattedAmount = amount.toFixed(2);
  
  if (SYMBOL_AFTER_CURRENCIES.includes(currency)) {
    return `${formattedAmount}${symbol}`;
  } else {
    return `${symbol}${formattedAmount}`;
  }
}

export function getCurrencySymbol(currency: Currency = 'EUR'): string {
  return CURRENCY_SYMBOLS[currency];
}

export function isSymbolAfter(currency: Currency = 'EUR'): boolean {
  return SYMBOL_AFTER_CURRENCIES.includes(currency);
}
