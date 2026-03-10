import type { buildPackingPayload } from "../lib/packing-payload";
import type { DispatchStatus } from "../types/dispatch.types";

type PackTaskPayloadArgs = {
  salesId: number;
  dispatchId: number;
  dispatchStatus: DispatchStatus;
  authorId: number;
  authorName: string;
  packingLines: ReturnType<typeof buildPackingPayload>["packingLines"];
};

export function buildPackItemTaskPayload(args: PackTaskPayloadArgs) {
  return {
    taskName: "update-sales-control" as const,
    payload: {
      meta: {
        salesId: args.salesId,
        authorId: args.authorId,
        authorName: args.authorName,
      },
      packItems: {
        dispatchId: args.dispatchId,
        dispatchStatus: args.dispatchStatus,
        packMode: "selection" as const,
        packingLines: args.packingLines,
      },
    },
  };
}
