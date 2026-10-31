export function formatMoney(amount: number, currency: string): string {
  const decimals = Number.isInteger(amount) ? 0 : 2;
  return new Intl.NumberFormat("es-MX", {
    style: "currency",
    currency,
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(amount);
}
