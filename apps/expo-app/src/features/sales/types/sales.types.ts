export type FilterOption = {
  label: string;
  value: string;
};

export type FilterItem = {
  label: string;
  value: string;
  type: "input" | "checkbox" | "date" | "date-range" | string;
  options?: FilterOption[];
};
