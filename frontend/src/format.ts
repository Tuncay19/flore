// 17 -> "17", 17.1 -> "17.10"
export const money = (n: number): string => (Number.isInteger(n) ? String(n) : n.toFixed(2));
