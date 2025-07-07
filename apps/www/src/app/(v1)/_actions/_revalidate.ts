"use server";

import { revalidatePath } from "next/cache";

// type RevalidatePaths =
//     | "pickup"
//     | "jobs"
//     | "orders"
//     | "estimates"
//     | "communityTasks"
//     | "communityTemplates";
const _path = {
    builders: "/settings/community/builders",
    communityTasks: "/contractor/assign-tasks",
    communityTemplates: "/settings/community/community-templates",
    communityTemplate: "/settings/community/community-template/[slug]",
    customers: "/sales/customers",
    contractorJobs: "/jobs/[type]",
    "contractor-overview": "/contractors/overview/[contractorId]",
    delivery: "/sales-v2/dispatch/delivery",
    dealers: "/sales-v2/dealers",
    quotes: "/sales/quotes",
    homes: "/community/units",
    jobs: "/contractor/jobs",
    orders: "/sales/orders",
    backorders: "/sales/back-orders",
    pickup: "/sales-v2/dispatch/pickup",
    projects: "/community/projects",
    "overview-order": "/sales/order/[slug]",
    "invoice-order": "/sales/order/[slug]/form",
    "overview-estimate": "/sales/quote/[slug]",
    "my-jobs": "tasks/installations",
    "invoice-estimate": "/sales/quote/[slug]/form",
    salesV2Form: "",
    "sales-production-2": "/sales-v2/productions",
    salesOverview: "/sales-v2/overview/[...typeAndSlug]",
    salesOverview1: "sales/order/[slug]",
    payables: "/sales/accounting/payables",
    employees: "/hrm/employees",
    customerProfiles: "/sales/customers/profiles",
    roles: "/hrm/roles",
};
export type RevalidatePaths = keyof typeof _path;
export async function _revalidate(pathName: RevalidatePaths) {
    const path = _path[pathName];
    await revalidatePath(path, "page");
}
export async function __revalidatePath(url, type = "page") {
    await revalidatePath(url, type as any);
}
