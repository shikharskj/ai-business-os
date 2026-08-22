/** Pre-GST line total from qty × rate − discount (display only; tax comes from engine). */
export function lineSubtotalBeforeGstMajor(input: {
  quantity: string;
  unitPrice: string;
  discount: string;
}): string {
  const qty = Number.parseFloat(input.quantity);
  const rate = Number.parseFloat(input.unitPrice);
  const discount = Number.parseFloat(input.discount || "0");
  if (!Number.isFinite(qty) || !Number.isFinite(rate) || !Number.isFinite(discount)) {
    return "—";
  }
  const total = Math.max(0, qty * rate - discount);
  return total.toFixed(2);
}
