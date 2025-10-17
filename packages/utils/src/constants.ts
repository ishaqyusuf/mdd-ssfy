export const blobPaths = ["inbound-documents", "dispatch-documents"] as const;
export type BlobPath = (typeof blobPaths)[number];

export const inboundFilterStatus = [
  "total",
  "pending",
  "complete",
  "missing items",
  "back order",
] as const;
export type InboundFilterStatus = (typeof inboundFilterStatus)[number];
export const noteTagNames = [
  "itemControlUID",
  "deliveryId",
  "dispatchRecipient",
  "salesId",
  "salesNo",
  "salesItemId",
  "salesAssignment",
  "inboundStatus",
  "status",
  "type",
  "attachment",
  "signature",
  "activity",
] as const;
export type NoteTagNames = (typeof noteTagNames)[number];
export const noteTypes = [
  "email",
  "general",
  "payment",
  "production",
  "dispatch",
  "inbound",
  "activity",
] as const;
export type NoteTagTypes = (typeof noteTypes)[number];
export const noteStatus = ["public", "private"] as const;
export type NoteTagStatus = (typeof noteStatus)[number];

export const salesDeliveryMode = ["pickup", "delivery"] as const;
export const salesType = ["order", "quote"] as const;

export const salesDispatchStatus = [
  "queue",
  "missing items",
  "in progress",
  "completed",
  "cancelled",
] as const;
export type SalesDispatchStatus = (typeof salesDispatchStatus)[number];

export const ROLES = [
  "Production",
  "Production",
  "Admin",
  "1099 Contractor",
  "Super Admin",
] as const;
export type Roles = (typeof ROLES)[number];
export const PERMISSIONS = [
  "viewProject",
  "editProject",
  "viewCommission",
  "editCommission",
  "viewAssignTasks",
  "editAssignTasks",
  "viewDocuments",
  "editDocuments",
  "viewJobs",
  "editJobs",
  "viewJobPayment",
  "editJobPayment",
  "viewDashboard",
  "editDashboard",
  "viewInvoice",
  "editInvoice",
  "viewRole",
  "editRole",
  "viewEmployee",
  "editEmployee",
  "viewProduction",
  "editProduction",
  "viewPrehungProduction",
  "editPrehungProduction",
  "viewDelivery",
  "editDelivery",
  "viewPickup",
  "editPickup",
  "viewCustomerService",
  "editCustomerService",
  "viewTech",
  "editTech",
  "viewInstallation",
  "editInstallation",
  "viewAssignInstaller",
  "editAssignInstaller",
  "viewBuilders",
  "editBuilders",
  "viewCost",
  "editCost",
  "viewOrders",
  "editOrders",
  "viewSalesCustomers",
  "editSalesCustomers",
  "viewEstimates",
  "editEstimates",
  "viewOrderProduction",
  "editOrderProduction",
  "viewOrderPayment",
  "editOrderPayment",
  "viewPriceList",
  "editPriceList",
  "viewCommunity",
  "viewHrm",
  "viewSales",
  "viewInboundOrder",
  "editInboundOrder",
  "viewPutaway",
  "editPutaway",
  "viewDecoShutterInstall",
  "editDecoShutterInstall",
  // sales
  "viewSalesLaborCost",
  "editSalesLaborCost",
  "viewSalesResolution",
  "editSalesResolution",
] as const;
export const PERMISSION_NAMES_PASCAL = [
  "Project",
  "Commission",
  "AssignTasks",
  "Documents",
  "Jobs",
  "JobPayment",
  "Dashboard",
  "Invoice",
  "Role",
  "Employee",
  "Production",
  "PrehungProduction",
  "Delivery",
  "Pickup",
  "CustomerService",
  "Tech",
  "Installation",
  "AssignInstaller",
  "Builders",
  "Cost",
  "Orders",
  "SalesCustomers",
  "Estimates",
  "OrderProduction",
  "OrderPayment",
  "PriceList",
  "Community",
  "Hrm",
  "Sales",
  "InboundOrder",
  "Putaway",
  "DecoShutterInstall",
  "SalesResolution",
  "SalesLaborCost",
  "SalesManager",
] as const;

export const PERMISSION_NAMES = [
  "assignInstaller",
  "assignTasks",
  "builders",
  "community",
  "commission",
  "cost",
  "customerService",
  "dashboard",
  "decoShutterInstall",
  "delivery",
  "documents",
  "employee",
  "estimates",
  "hrm",
  "inboundOrder",
  "installation",
  "invoice",
  "jobPayment",
  "jobs",
  "orders",
  "orderPayment",
  "orderProduction",
  "pickup",
  "prehungProduction",
  "priceList",
  "production",
  "project",
  "putaway",
  "role",
  "sales",
  "salesCustomers",
  "salesLaborCost",
  "salesResolution",
  "salesManager",
  // "salesSupplierManager",
  "tech",
] as const;
export type PascalResource = (typeof PERMISSION_NAMES_PASCAL)[number];
type Action = "edit" | "view";
export type PermissionScope = `${Action}${PascalResource}`;

export type ICan = { [permission in PermissionScope]: boolean };
export const allPermissions = () =>
  PERMISSION_NAMES_PASCAL.map((a) => [`edit${a}`, `view${a}`]).flat();
export const PRODUCTION_ASSIGNMENT_FILTER_OPTIONS = [
  "not assigned",
  "part assigned",
  "all assigned",
] as const;
export const PRODUCTION_STATUS = [
  "not assigned",
  "part assigned",
  "due today",
  "past due",
  "completed",
  "not completed",
] as const;
export const PRODUCTION_FILTER_OPTIONS = [
  "pending",
  "in progress",
  "completed",
] as const;
export const RESOLUTION_FILTER_OPTIONS = [
  "Resolved",
  "Resolved Today",
  "Unresolved",
] as const;
export const INVOICE_FILTER_OPTIONS = [
  "paid",
  "pending",
  "late",
  "part-paid",
  "overdraft",
] as const;
export const DISPATCH_FILTER_OPTIONS = [
  "queue",
  "in progress",
  "cancelled",
  "completed",
] as const;
export const SALES_DISPATCH_FILTER_OPTIONS = [
  "pending",
  "completed",
  "late",
  "backorder",
] as const;

export const daysFilters = [
  "yesterday",
  "today",
  // "tomorrow",
  "this week",
  "last week",
  // 'next week',
  "this month",
  "last month",
  "last 2 months",
  "last 6 months",
  // "this year",
  // "last year",
] as const;
export type DaysFilters = (typeof daysFilters)[number];
