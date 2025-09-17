import type { TRPCContext } from "@api/trpc/init";
import { paginationSchema } from "@gnd/utils/schema";
import { z } from "zod";

export const accountingIndexSchema = z.object({}).merge(paginationSchema);
export type AccountingIndex = z.infer<typeof accountingIndexSchema>;

export async function accountingIndex(
  ctx: TRPCContext,
  query: AccountingIndex
) {}

function whereAccounting(query: AccountingIndex) {}
