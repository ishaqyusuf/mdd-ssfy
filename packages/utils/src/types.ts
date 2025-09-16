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
