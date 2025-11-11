import type { PageFilterData, SalesType } from "@api/type";
export function optionFilter<T>(
  value: T,
  label,
  options: ({ label: any; value: any } | string)[]
) {
  return {
    label,
    value,
    options: options
      .map((a) => (typeof a !== "object" ? { label: a, value: a } : a))
      .map(({ label, value }) => ({
        label,
        value: value, //?.toString(),
      })),
    type: "checkbox",
  } satisfies PageFilterData<T>;
}
export function dateFilter<T>(value: T, label) {
  return {
    label,
    value,
    type: "date",
  } satisfies PageFilterData<T>;
}
export function dateRangeFilter<T>(value: T, label) {
  return {
    label,
    value,
    type: "date-range",
  } satisfies PageFilterData<T>;
}
const searchFilter = {
  label: "Search",
  type: "input",
  value: "q",
} as PageFilterData<"q">;
