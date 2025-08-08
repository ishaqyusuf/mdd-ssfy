import type { CommunityTemplateQueryParams } from "@api/schemas/community";
import type { DispatchQueryParamsSchema } from "@api/schemas/sales";
import type {
  InboundQuerySchema,
  SalesQueryParamsSchema,
} from "@api/schemas/sales";
import type { TRPCContext } from "@api/trpc/init";
import type { PageFilterData, SalesType } from "@api/type";
import {
  DISPATCH_FILTER_OPTIONS,
  INVOICE_FILTER_OPTIONS,
  PRODUCTION_ASSIGNMENT_FILTER_OPTIONS,
  PRODUCTION_FILTER_OPTIONS,
  PRODUCTION_STATUS,
  RESOLUTION_FILTER_OPTIONS,
  SALES_DISPATCH_FILTER_OPTIONS,
  salesDispatchStatus,
  salesType,
} from "@gnd/utils/constants";
import { buildersList, projectList } from "./community";
import type { GetSalesResolutions } from "./sales-resolution";

export async function getDispatchFilters(ctx: TRPCContext) {
  type T = keyof DispatchQueryParamsSchema;
  type FilterData = PageFilterData<T>;
  const resp = [
    searchFilter,
    optionFilter<T>(
      "status",
      "Status",
      salesDispatchStatus.map((status) => ({
        label: status,
        value: status,
      }))
    ),
    dateRangeFilter<T>("scheduleDate", "Schedule Date"),
  ] as FilterData[];
  return resp;
}
export async function getInboundFilters(ctx: TRPCContext) {
  type FilterData = PageFilterData<keyof InboundQuerySchema>;
  const resp = [searchFilter] as FilterData[];
  return resp;
}
function optionFilter<T>(
  value: T,
  label,
  options: { label: any; value: any }[]
) {
  return {
    label,
    value,
    options,
    type: "date",
  } satisfies PageFilterData<T>;
}
function dateFilter<T>(value: T, label) {
  return {
    label,
    value,
    type: "date",
  } satisfies PageFilterData<T>;
}
function dateRangeFilter<T>(value: T, label) {
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
};
export async function getCommunityTemplateFilters(ctx: TRPCContext) {
  type T = keyof CommunityTemplateQueryParams;
  type FilterData = PageFilterData<keyof CommunityTemplateQueryParams>;

  const builders = await buildersList(ctx);
  const projects = await projectList(ctx);
  const resp = [
    searchFilter,
    optionFilter<T>(
      "builderId",
      "Builder",
      builders.map((b) => ({
        label: b.name,
        value: b.id,
      }))
    ),
    optionFilter<T>(
      "projectId",
      "Projects",
      projects.map((b) => ({
        label: b.title,
        value: b.id,
      }))
    ),
  ];
  return resp as FilterData[];
}
export async function getSalesOrderFilters(ctx: TRPCContext) {
  type T = keyof SalesQueryParamsSchema;
  type FilterData = PageFilterData<T>;

  const sales = await ctx.db.salesOrders.findMany({
    where: { type: "quote" as SalesType },
    select: {
      orderId: true,
      meta: true,
      customer: {
        select: {
          businessName: true,
          name: true,
          phoneNo: true,
        },
      },
      billingAddress: {
        select: {
          phoneNo: true,
        },
      },
      salesRep: {
        select: {
          name: true,
        },
      },
    },
  });

  const customerNames = [
    ...new Set(
      sales
        .flatMap((s) => [s.customer?.name, s.customer?.businessName])
        .filter(Boolean)
    ),
  ];
  const phones = [
    ...new Set(
      sales
        .flatMap((s) => [s.customer?.phoneNo, s.billingAddress?.phoneNo])
        .filter(Boolean)
    ),
  ];
  const pos = [
    ...new Set(sales.map((s) => (s.meta as any)?.po).filter(Boolean)),
  ];
  const salesReps = [
    ...new Set(sales.map((s) => s.salesRep?.name).filter(Boolean)),
  ];
  const orderNos = [...new Set(sales.map((s) => s.orderId).filter(Boolean))];

  const resp = [
    searchFilter,
    optionFilter<T>(
      "customer.name",
      "Customer",
      customerNames.map((name) => ({ label: name, value: name }))
    ),
    optionFilter<T>(
      "phone",
      "Phone",
      phones.map((phone) => ({ label: phone, value: phone }))
    ),
    optionFilter<T>(
      "po",
      "P.O",
      pos.map((po) => ({ label: po, value: po }))
    ),
    optionFilter<T>(
      "sales.rep",
      "Sales Rep",
      salesReps.map((rep) => ({ label: rep, value: rep }))
    ),
    optionFilter<T>(
      "salesNo",
      "Order #",
      orderNos.map((no) => ({ label: no, value: no }))
    ),
    optionFilter<T>(
      "dispatch.status",
      "Fullfilment",
      SALES_DISPATCH_FILTER_OPTIONS.map((status) => ({
        label: status,
        value: status,
      }))
    ),
    // optionFilter<T>(
    //   "production.status",
    //   "Production Status",
    //   PRODUCTION_STATUS.map((status) => ({ label: status, value: status })),
    // ),
    optionFilter<T>(
      "invoice",
      "Invoice Status",
      INVOICE_FILTER_OPTIONS.map((status) => ({
        label: status,
        value: status,
      }))
    ),
    // optionFilter<T>(
    //   "production.assignment",
    //   "Production Assignment",
    //   PRODUCTION_ASSIGNMENT_FILTER_OPTIONS.map((status) => ({
    //     label: status,
    //     value: status,
    //   })),
    // ),
    optionFilter<T>(
      "production",
      "Production",
      PRODUCTION_FILTER_OPTIONS.map((status) => ({
        label: `${status}`,
        value: status,
      }))
    ),
  ];
  return resp as FilterData[];
}

export async function getResolutionFilters(ctx: TRPCContext) {
  const baseFilters = await getSalesOrderFilters(ctx);
  type T = keyof GetSalesResolutions;
  type TOrdersFilter = keyof SalesQueryParamsSchema;
  type FilterData = PageFilterData<T>;

  const resp: FilterData[] = baseFilters.filter((a) =>
    (["q", "salesNo", "customer.name"] as TOrdersFilter[]).includes(
      a.value as any
    )
  ) as any;
  resp.push(
    optionFilter<T>(
      "status",
      "Status",
      RESOLUTION_FILTER_OPTIONS.map((status) => ({
        label: `${status}`,
        value: status,
      }))
    )
  );
  return resp;
}
export async function getSalesQuoteFilter(ctx: TRPCContext) {
  type T = keyof SalesQueryParamsSchema;
  type FilterData = PageFilterData<T>;

  const sales = await ctx.db.salesOrders.findMany({
    where: {
      type: "quote" as SalesType,
    },
    select: {
      orderId: true,
      meta: true,
      customer: {
        select: {
          businessName: true,
          name: true,
          phoneNo: true,
        },
      },
      billingAddress: {
        select: {
          phoneNo: true,
        },
      },
      salesRep: {
        select: {
          name: true,
        },
      },
    },
  });

  const customerNames = [
    ...new Set(
      sales
        .flatMap((s) => [s.customer?.name, s.customer?.businessName])
        .filter(Boolean)
    ),
  ];
  const phones = [
    ...new Set(
      sales
        .flatMap((s) => [s.customer?.phoneNo, s.billingAddress?.phoneNo])
        .filter(Boolean)
    ),
  ];
  const pos = [
    ...new Set(sales.map((s) => (s.meta as any)?.po).filter(Boolean)),
  ];
  const salesReps = [
    ...new Set(sales.map((s) => s.salesRep?.name).filter(Boolean)),
  ];
  const orderNos = [...new Set(sales.map((s) => s.orderId).filter(Boolean))];

  const resp = [
    searchFilter,
    optionFilter<T>(
      "customer.name",
      "Customer",
      customerNames.map((name) => ({ label: name, value: name }))
    ),
    optionFilter<T>(
      "phone",
      "Phone",
      phones.map((phone) => ({ label: phone, value: phone }))
    ),
    optionFilter<T>(
      "po",
      "P.O",
      pos.map((po) => ({ label: po, value: po }))
    ),
    optionFilter<T>(
      "sales.rep",
      "Sales Rep",
      salesReps.map((rep) => ({ label: rep, value: rep }))
    ),
    optionFilter<T>(
      "salesNo",
      "Quote #",
      orderNos.map((no) => ({ label: no, value: no }))
    ),
  ];
  return resp as FilterData[];
}
