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
  "salesId",
  "salesItemId",
  "salesAssignment",
  "inboundStatus",
  "status",
  "type",
  "attachment",
] as const;
export type NoteTagNames = (typeof noteTagNames)[number];
export const noteTypes = [
  "email",
  "general",
  "payment",
  "production",
  "dispatch",
  "inbound",
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

export const ROLES = ["Production"] as const;
export type Roles = (typeof salesDispatchStatus)[number];
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
  "tech",
] as const;
export type PascalResource = (typeof PERMISSION_NAMES_PASCAL)[number];
type Action = "edit" | "view";
export type PermissionScope = `${Action}${PascalResource}`;
