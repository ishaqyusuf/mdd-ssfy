import type { CommunityTemplateQueryParams } from "@api/schemas/community";
import type { DispatchQueryParamsSchema } from "@api/schemas/sales";
import type {
  InboundQuerySchema,
  SalesQueryParamsSchema,
} from "@api/schemas/sales";
import type { TRPCContext } from "@api/trpc/init";
import type { PageFilterData, SalesType } from "@api/type";
import {
  INVOICE_FILTER_OPTIONS,
  PRODUCTION_FILTER_OPTIONS,
  RESOLUTION_FILTER_OPTIONS,
  SALES_DISPATCH_FILTER_OPTIONS,
  salesDispatchStatus,
  type Roles,
} from "@gnd/utils/constants";
import {
  buildersList,
  projectList,
  type GetCommunityProjectsSchema,
} from "./community";
import type { GetSalesResolutions } from "./sales-resolution";
import type { InventoryList, SalesProductionQueryParams } from "@sales/schema";
import { getEmployeesList } from "./hrm";
import { labelValueOptions, sortList, uniqueList } from "@gnd/utils";
import { SALES_PRODUCTION_STATUS_FILTER_OPTIONS } from "@sales/constants";
import type { ProductReportSchema } from "./product-report";
import type { GetBacklogsSchema } from "./backlogs";
import type { GetCommunityTemplatesSchema } from "./community-template";

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
    options: options.map(({ label, value }) => ({
      label,
      value: value, //?.toString(),
    })),
    type: "checkbox",
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
} as PageFilterData<"q">;
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
export async function communityProjectFilters(ctx: TRPCContext) {
  type T = keyof GetCommunityProjectsSchema;
  type FilterData = PageFilterData<T>;
  // const steps = labelValueOptions(
  //   await ctx.db.Projects.findMany({
  //     where: {},
  //     select: {
  //       id: true,
  //       title: true,
  //     },
  //   }),
  //   "title",
  //   "id"
  // );
  const resp = [
    searchFilter,
    // optionFilter<T>("categoryId", "Category", steps),
    // dateRangeFilter<T>("dateRange", "Filter by date"),
  ] satisfies FilterData[];

  return resp;
}
export async function getCustomerFilters(ctx: TRPCContext) {
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
export async function getSalesOrderFilters(
  ctx: TRPCContext,
  isSalesManager?: boolean
) {
  type T = keyof SalesQueryParamsSchema;
  type FilterData = PageFilterData<T>;

  const sales = await ctx.db.salesOrders.findMany({
    where: { type: "order" as SalesType },
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
    // isSalesManager
    //   ? optionFilter<T>(
    //       "showing",
    //       "Show",
    //       ["all sales", "my sales"].map((rep) => ({ label: rep, value: rep }))
    //     )
    //   : null,
    dateRangeFilter<T>("dateRange", "Order date"),
    optionFilter<T>(
      "customer.name",
      "Customer",
      uniqueList(
        sortList(
          customerNames
            .map((a) => a?.trim())
            .map((label) => ({
              label,
              value: label,
              // label: name?.replace(",", ""),
              // value: name?.replace(",", ""),
            })),
          "value"
        ),
        "value"
      )
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
    isSalesManager
      ? optionFilter<T>(
          "sales.rep",
          "Sales Rep",
          salesReps.map((rep) => ({ label: rep, value: rep }))
        )
      : null,
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
    optionFilter<T>(
      "invoice",
      "Invoice Status",
      INVOICE_FILTER_OPTIONS.map((status) => ({
        label: status,
        value: status,
      }))
    ),
    optionFilter<T>(
      "production",
      "Production",
      PRODUCTION_FILTER_OPTIONS.map((status) => ({
        label: `${status}`,
        value: status,
      }))
    ),
  ].filter(Boolean);
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
function transformFilter<T extends { key: string; value: any }>(
  filters: T[],
  k: T["key"],
  v: any
) {
  const filter = filters.find((f) => f.key === k);
  if (filter) {
    filter.value = v;
  }
  return filter;
}

export async function getSalesProductionFilters(ctx: TRPCContext) {
  const baseFilters = await getSalesOrderFilters(ctx);
  type T = keyof SalesProductionQueryParams;
  type TOrdersFilter = keyof SalesQueryParamsSchema;
  type FilterData = PageFilterData<T>;

  const resp: FilterData[] = [
    ...(baseFilters.filter((a) =>
      (["q", "salesNo"] as TOrdersFilter[]).includes(a.value as any)
    ) as any),
    {
      value: "production",
      type: "checkbox",
      label: "Production Status",
      options: labelValueOptions([...SALES_PRODUCTION_STATUS_FILTER_OPTIONS]),
    },
    {
      value: "assignedToId",
      type: "checkbox",
      label: "Assigned To",
      options: labelValueOptions(
        await getEmployeesList(ctx, {
          roles: ["Production"],
        }),
        "name",
        "id"
      ),
    },
  ];

  return resp;
}
export async function getSalesQuoteFilter(ctx: TRPCContext, isSalesManager?) {
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
    isSalesManager
      ? optionFilter<T>(
          "showing",
          "Show",
          ["all sales", "my sales"].map((rep) => ({ label: rep, value: rep }))
        )
      : null,
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
    isSalesManager
      ? optionFilter<T>(
          "sales.rep",
          "Sales Rep",
          salesReps.map((rep) => ({ label: rep, value: rep }))
        )
      : null,
    optionFilter<T>(
      "salesNo",
      "Quote #",
      orderNos.map((no) => ({ label: no, value: no }))
    ),
  ].filter(Boolean);
  return resp as FilterData[];
}
export async function getInventoryFilters(ctx: TRPCContext) {
  type T = keyof InventoryList;
  type FilterData = PageFilterData<T>;
  const categories = await ctx.db.inventoryCategory.findMany({
    select: {
      title: true,
      id: true,
      _count: {
        select: {
          inventories: {
            where: {
              deletedAt: null,
            },
          },
        },
      },
    },
  });
  const resp: FilterData[] = [
    // searchFilter,
    {
      ...(searchFilter as any),
    },
    optionFilter<T>(
      "categoryId",
      "Category",
      categories.map((c) => ({
        label: c.title,
        value: c.id,
      }))
    ),
  ];
  return resp;
}
export async function productReportFilters(ctx: TRPCContext) {
  type T = keyof ProductReportSchema;
  type FilterData = PageFilterData<T>;
  const steps = (
    await ctx.db.dykeSteps.findMany({
      where: {
        stepForms: {
          some: {
            deletedAt: null,
            salesOrderItem: {
              deletedAt: null,
              salesOrder: {
                deletedAt: null,
                type: "order",
              },
            },
          },
        },
      },
      select: {
        id: true,
        title: true,
      },
      orderBy: {
        createdAt: "desc",
      },
      distinct: "title",
    })
  ).map(({ title }) => ({
    label: title,
    value: title,
  }));
  // "title",
  // "title"
  const resp = [
    searchFilter,
    optionFilter<T>("reportCategory", "Category", steps),
    dateRangeFilter<T>("dateRange", "Filter by date"),
  ] satisfies FilterData[];

  return resp;
}

export async function backlogFilters(ctx: TRPCContext) {
  type T = keyof GetBacklogsSchema;
  type FilterData = PageFilterData<T>;
  // const steps = labelValueOptions(
  //   await ctx.db.Backlogs.findMany({
  //     where: {},
  //     select: {
  //       id: true,
  //       title: true,
  //     },
  //   }),
  //   "title",
  //   "id"
  // );
  const resp = [
    searchFilter,
    // optionFilter<T>("categoryId", "Category", steps),
    // dateRangeFilter<T>("dateRange", "Filter by date"),
  ] satisfies FilterData[];

  return resp;
}
export async function communityTemplateFilters(ctx: TRPCContext) {
  type T = keyof GetCommunityTemplatesSchema;
  type FilterData = PageFilterData<T>;
  // const steps = labelValueOptions(
  //   await ctx.db.CommunityModels.findMany({
  //     where: {},
  //     select: {
  //       id: true,
  //       title: true,
  //     },
  //   }),
  //   "title",
  //   "id"
  // );
  const resp = [
    searchFilter,
    // optionFilter<T>("categoryId", "Category", steps),
    // dateRangeFilter<T>("dateRange", "Filter by date"),
  ] satisfies FilterData[];

  return resp;
}
