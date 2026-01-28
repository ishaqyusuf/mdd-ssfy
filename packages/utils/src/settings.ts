export const SETTINGS_TYPE = [
  "sales-settings",
  "install-price-chart",
  "show-job-task-prices-to-customers",
  "allow-custom-jobs",
] as const;

export type SettingType = (typeof SETTINGS_TYPE)[number];
