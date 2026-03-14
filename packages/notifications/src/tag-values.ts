export function serializeTagValue(value: unknown): string {
  if (value === undefined) return "null";
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}

export function deserializeTagValue(value: unknown): unknown {
  if (typeof value !== "string") return value;
  if (value === "undefined") return undefined;

  try {
    return JSON.parse(value);
  } catch {
    if (/^-?\d+(\.\d+)?$/.test(value)) return Number(value);
    if (value === "true") return true;
    if (value === "false") return false;
    return value;
  }
}

export function explodeTagEntries(tags: Record<string, unknown>) {
  return Object.entries(tags).flatMap(([tagName, tagValue]) => {
    if (tagValue === undefined) return [];
    if (Array.isArray(tagValue)) {
      return tagValue
        .filter((value) => value !== undefined)
        .map((value) => ({ tagName, tagValue: serializeTagValue(value) }));
    }
    return [{ tagName, tagValue: serializeTagValue(tagValue) }];
  });
}

export function mergeTagRows(
  rows: Array<{ tagName: string; tagValue: unknown }>,
): Record<string, unknown> {
  const result: Record<string, unknown> = {};

  for (const row of rows) {
    const value = deserializeTagValue(row.tagValue);
    const existing = result[row.tagName];

    if (existing === undefined) {
      result[row.tagName] = value;
      continue;
    }

    if (Array.isArray(existing)) {
      existing.push(value);
      continue;
    }

    result[row.tagName] = [existing, value];
  }

  return result;
}
