export type LineItem = { sku: string; unitPriceCents: number; quantity: number };

export function subtotalCents(items: LineItem[]): number {
  return items.reduce((sum, item) => sum + item.unitPriceCents * item.quantity, 0);
}

export function applyDiscount(totalCents: number, discount?: { percent: number }): number {
  if (!discount) return totalCents;
  const pct = Math.min(Math.max(discount.percent, 0), 100);
  return Math.round(totalCents * (1 - pct / 100));
}

export function quote(items: LineItem[], discount?: { percent: number }) {
  const subtotal = subtotalCents(items);
  return { subtotalCents: subtotal, totalCents: applyDiscount(subtotal, discount) };
}
