const ACCENT_PALETTE = [
  '#f87171', // red
  '#fb923c', // orange
  '#facc15', // yellow
  '#4ade80', // green
  '#22d3ee', // cyan
  '#60a5fa', // blue
  '#a78bfa', // violet
  '#f472b6', // pink
  '#a4e745', // lime
];

export function colorFromId(id: string | number | null | undefined): string {
  const str = String(id ?? '');
  if (!str) return ACCENT_PALETTE[ACCENT_PALETTE.length - 1];

  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash * 31 + str.charCodeAt(i)) >>> 0;
  }
  return ACCENT_PALETTE[hash % ACCENT_PALETTE.length];
}
