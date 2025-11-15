/**
 * Formats a number into a currency string based on the country.
 * @param value The number to format.
 * @param country The country code ('BR' or 'PT').
 * @returns A formatted currency string (e.g., "R$ 10,50" or "10,50 €").
 */
export const formatCurrency = (value: number, country: 'BR' | 'PT' | undefined | null): string => {
  // Garante que o valor seja um número, tratando casos de null/undefined.
  const numericValue = typeof value === 'number' ? value : 0;

  const currency = country === 'PT' ? 'EUR' : 'BRL';
  const locale = country === 'PT' ? 'pt-PT' : 'pt-BR';

  try {
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency: currency,
    }).format(numericValue);
  } catch (error) {
    console.error("Currency formatting failed:", error);
    // Fallback em caso de erro
    return country === 'PT' ? `${numericValue.toFixed(2)} €` : `R$ ${numericValue.toFixed(2)}`;
  }
};