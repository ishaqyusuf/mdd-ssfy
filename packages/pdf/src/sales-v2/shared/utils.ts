export function resolveImageSrc(
  src: string | null | undefined,
  baseUrl?: string,
): string | null {
  if (!src) return null;
  if (/^https?:\/\//i.test(src) || src.startsWith("data:")) return src;
  if (!baseUrl) return src;
  const normalizedBase = baseUrl.replace(/\/$/, "");
  const normalizedSrc = src.startsWith("/") ? src : `/${src}`;
  return `${normalizedBase}${normalizedSrc}`;
}

export function colWidth(
  span: number | null | undefined,
  allSpans: number,
): string {
  if (!span) return `${100 - allSpans * 5}%`;
  return `${Number(span) * 5}%`;
}

export function sumColSpans(cells: { colSpan?: number }[]): number {
  return cells.reduce((a, c) => a + (c.colSpan ?? 0), 0);
}
