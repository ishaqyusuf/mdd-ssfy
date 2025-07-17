import type { DispatchQueryParamsSchema } from "@api/schemas/dispatch";
import type { InboundQuerySchema } from "@api/schemas/sales";
import type { TRPCContext } from "@api/trpc/init";
import type { PageFilterData } from "@api/type";

export async function getDispatchFilters(ctx: TRPCContext) {
  type FilterData = PageFilterData<keyof DispatchQueryParamsSchema>;
  const resp = [
    {
      label: "Search",
      type: "input",
      value: "q",
    },
  ] as FilterData[];
}
export async function getInboundFilters(ctx: TRPCContext) {
  type FilterData = PageFilterData<keyof InboundQuerySchema>;
  const resp = [
    {
      label: "Search",
      type: "input",
      value: "q",
    },
  ] as FilterData[];
}
