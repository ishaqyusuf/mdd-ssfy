export type PageFilterData<TValue = string> = {
  value?: TValue;
  icon?;
  type: "checkbox" | "input" | "date" | "date-range";
  label?: string;
  options?: {
    label: string;
    subLabel?: string;
    value: string;
  }[];
};

export type CamelCaseType<T extends string> =
  T extends `${infer First}-${infer Rest}`
    ? `${Lowercase<First>}${Capitalize<CamelCaseType<Rest>>}`
    : Lowercase<T>;
