import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatPrice(price: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(price);
}
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
