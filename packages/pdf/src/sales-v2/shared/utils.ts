export function resolveImageSrc(
  src: string | null | undefined,
  baseUrl?: string,
): string | null {
  if (!src) return null;
  const value = String(src).trim();
  if (!value) return null;
  if (
    /^https?:\/\//i.test(value) ||
    value.startsWith("data:") ||
    value.startsWith("blob:")
  ) {
    return value;
  }

  const cloudinaryBase = String(
    process.env.NEXT_PUBLIC_CLOUDINARY_BASE_URL || "",
  ).replace(/\/$/, "");
  const normalizedValue = value.replace(/^\//, "");

  if (cloudinaryBase) {
    if (normalizedValue.startsWith("dyke/")) {
      return `${cloudinaryBase}/${normalizedValue}`;
    }
    return `${cloudinaryBase}/dyke/${normalizedValue}`;
  }

  if (!baseUrl) return normalizedValue;
  const normalizedBase = /^https?:\/\//i.test(baseUrl)
    ? baseUrl.replace(/\/$/, "")
    : `https://${baseUrl.replace(/\/$/, "")}`;
  return `${normalizedBase}/${normalizedValue}`;
}

export function resolveDocumentImageSrc(
  src: string | null | undefined,
  baseUrl?: string,
): string | null {
  if (!src) return null;
  const value = String(src).trim();
  if (!value) return null;
  if (
    /^https?:\/\//i.test(value) ||
    value.startsWith("data:") ||
    value.startsWith("blob:")
  ) {
    return value;
  }

  const normalizedValue = value.replace(/^\//, "");
  if (!baseUrl) return normalizedValue;
  const normalizedBase = /^https?:\/\//i.test(baseUrl)
    ? baseUrl.replace(/\/$/, "")
    : `https://${baseUrl.replace(/\/$/, "")}`;
  return `${normalizedBase}/${normalizedValue}`;
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
