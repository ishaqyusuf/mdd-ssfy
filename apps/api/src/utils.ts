export function composeQuery<T>(queries: T[]): T | undefined {
  if (!Array.isArray(queries) || queries.length === 0) {
    return undefined;
  }
  return queries.length > 1
    ? ({
        AND: queries,
      } as T)
    : queries[0];
}
