import type { NotificationHandler, UserData } from "../base";
import {
  type SalesRequestPackingInput,
  salesRequestPackingSchema,
} from "../schemas";

export const salesRequestPacking: NotificationHandler = {
  schema: salesRequestPackingSchema,
  createActivity(
    data: SalesRequestPackingInput,
    author: UserData,
    _contact: UserData,
  ) {
    const requestedCount = data.packItems?.packingList?.length || 0;
    return {
      type: "sales_request_packing",
      source: "user",
      subject: "Packing request submitted",
      headline: `Order ${data.orderNo} has ${requestedCount} item${requestedCount === 1 ? "" : "s"} requested for packing review.`,
      authorId: author.id,
      tags: {
        orderNo: data.orderNo,
        dispatchId: data.dispatchId,
        packItems: data.packItems,
      },
    };
  },
};
