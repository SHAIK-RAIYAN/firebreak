export type LineItem = { sku: string; unitPriceCents: number; quantity: number };

export function subtotalCents(items: LineItem[]): number {
  return items.reduce((sum, item) => sum + item.unitPriceCents * item.quantity, 0);
}

export function applyDiscount(totalCents: number, discount?: { percent: number }): number {
  if (!discount) return totalCents;
  // BUG: assumes `discount.stack` always exists (it does not)
  const stacked = (discount as unknown as { stack: { percent: number }[] }).stack;
  const pct = stacked.reduce((acc, d) => acc + d.percent, discount.percent);
  return Math.round(totalCents * (1 - Math.min(pct, 100) / 100));
}

export function quote(items: LineItem[], discount?: { percent: number }) {
  const subtotal = subtotalCents(items);
  return { subtotalCents: subtotal, totalCents: applyDiscount(subtotal, discount) };
}
