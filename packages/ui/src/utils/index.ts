export * from "./cn";
export * from "./truncate";
export function skeletonListData<T>(
  data: T[],
  count = 5,
  placeholder: Partial<T> | null = null
) {
  if (!data)
    return Array(count)
      .fill(null)
      .map((a) => placeholder) as any as T[];
  return data;
}
