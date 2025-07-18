import type { DispatchQueryParamsSchema } from "@api/schemas/dispatch";
import type {
  InboundQuerySchema,
  SalesQueryParamsSchema,
} from "@api/schemas/sales";
import type { TRPCContext } from "@api/trpc/init";
import type { PageFilterData } from "@api/type";
import { salesDispatchStatus } from "@gnd/utils/constants";

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
      })),
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
  options: { label: any; value: any }[],
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

export async function getSalesOrderFilters(ctx: TRPCContext) {
  type T = keyof SalesQueryParamsSchema;
  type FilterData = PageFilterData<T>;

  const sales = await ctx.db.salesOrders.findMany({
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
        .filter(Boolean),
    ),
  ];
  const phones = [
    ...new Set(
      sales
        .flatMap((s) => [s.customer?.phoneNo, s.billingAddress?.phoneNo])
        .filter(Boolean),
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
      customerNames.map((name) => ({ label: name, value: name })),
    ),
    optionFilter<T>(
      "phone",
      "Phone",
      phones.map((phone) => ({ label: phone, value: phone })),
    ),
    optionFilter<T>(
      "po",
      "P.O",
      pos.map((po) => ({ label: po, value: po })),
    ),
    optionFilter<T>(
      "sales.rep",
      "Sales Rep",
      salesReps.map((rep) => ({ label: rep, value: rep })),
    ),
    optionFilter<T>(
      "order.no",
      "Order #",
      orderNos.map((no) => ({ label: no, value: no })),
    ),
  ];
  return resp as FilterData[];
}
