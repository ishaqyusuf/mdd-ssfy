export type SalesResolutionConflictType = (typeof conflictType)[number];
export const conflictType = [
  "duplicate payments",
  "payment not up to date",
  "overpayment",
  "resolved",
] as const;
