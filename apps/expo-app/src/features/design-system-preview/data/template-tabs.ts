import type { IconKeys } from "@/components/ui/icon";

export type TemplateTab = {
  icon: IconKeys;
  label: string;
};

export const opsConsoleTabs: TemplateTab[] = [
  { icon: "LayoutGrid", label: "Home" },
  { icon: "Inbox", label: "Inbox" },
  { icon: "LineChart", label: "Sales" },
  { icon: "Calendar", label: "Calendar" },
  { icon: "Menu", label: "More" },
];

export const fieldFlowTabs: TemplateTab[] = [
  { icon: "LayoutGrid", label: "Home" },
  { icon: "Truck", label: "Route" },
  { icon: "Package", label: "Pack" },
  { icon: "Camera", label: "Proof" },
  { icon: "User", label: "Me" },
];

export const salesLedgerTabs: TemplateTab[] = [
  { icon: "LayoutGrid", label: "Home" },
  { icon: "Briefcase", label: "Sales" },
  { icon: "CircleDollarSign", label: "Money" },
  { icon: "Truck", label: "Ship" },
  { icon: "Menu", label: "More" },
];

export const opsDetailTabs = [
  "Overview",
  "Timeline",
  "Checklist",
  "Notes",
  "Actions"
];

export const fieldDetailTabs = [
  "Overview",
  "Stops",
  "Items",
  "Proof",
  "Activity"
];

export const salesDetailTabs = [
  "Overview",
  "Items",
  "Payments",
  "Fulfillment",
  "Activity"
];
