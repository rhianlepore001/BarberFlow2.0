/**
 * Formats a number into a currency string based on the provided currency code.
 * @param value The number to format.
 * @param currency The currency code ('BRL' or 'EUR').
 * @returns A formatted currency string (e.g., "R$ 10,50" or "10,50 €").
 */
export const formatCurrency = (value: number, currency: 'BRL' | 'EUR' | undefined | null): string => {
  // Garante que o valor seja um número, tratando casos de null/undefined.
  const numericValue = typeof value === 'number' ? value : 0;

  const locale = currency === 'EUR' ? 'pt-PT' : 'pt-BR';
  const defaultCurrency = currency || 'BRL'; // Garante um valor padrão

  try {
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency: defaultCurrency,
    }).format(numericValue);
  } catch (error) {
    console.error("Currency formatting failed:", error);
    // Fallback em caso de erro
    return defaultCurrency === 'EUR' ? `${numericValue.toFixed(2)} €` : `R$ ${numericValue.toFixed(2)}`;
  }
};