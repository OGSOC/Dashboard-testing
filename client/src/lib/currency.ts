const SYMBOLS: Record<string, string> = { GBP: '£', USD: '$', EUR: '€' };

export function currencySymbol(currency: string | undefined): string {
  return SYMBOLS[currency ?? 'GBP'] ?? currency ?? '';
}
