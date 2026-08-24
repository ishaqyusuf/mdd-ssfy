import type { NotificationHandler, UserData } from "../base";
import {
  type DispatchPackingDelayInput,
  type DispatchPackingDelayTags,
  dispatchPackingDelaySchema,
} from "../schemas";

export const dispatchPackingDelay: NotificationHandler = {
  schema: dispatchPackingDelaySchema,
  createActivity(
    data: DispatchPackingDelayInput,
    author: UserData,
    _contact: UserData,
  ) {
    const payload: DispatchPackingDelayTags = {
      type: "dispatch_packing_delay",
      source: "user",
      // The notification center intentionally shows priority 1-3. Guarded
      // packing requires a user decision, so it must be visible there.
      priority: 2,
      reviewId: data.reviewId,
      reviewStatus: data.reviewStatus,
      reviewerName: data.reviewerName,
      orderNo: data.orderNo,
      dispatchId: data.dispatchId,
      salesItemId: data.salesItemId,
      itemUid: data.itemUid,
      itemName: data.itemName,
      pendingQty: data.pendingQty,
      note: data.note,
    };

    const singleQty = Number(data.pendingQty.qty || 0);
    const qty =
      singleQty > 0
        ? singleQty
        : Number(data.pendingQty.lh || 0) + Number(data.pendingQty.rh || 0);

    const approved = data.reviewStatus === "APPROVED";
    const rejected = data.reviewStatus === "REJECTED";
    return {
      type: "dispatch_packing_delay",
      source: "user",
      subject: approved
        ? "Guarded packing approved"
        : rejected
          ? "Guarded packing rejected"
          : "Guarded packing needs approval",
      headline: approved
        ? `${data.itemName} (${qty}) is approved and now counts as packed.`
        : rejected
          ? `${data.itemName} (${qty}) was not approved for packing.`
          : `${data.itemName} (${qty}) was physically verified while production or material evidence is pending.`,
      authorId: author.id,
      tags: payload,
    };
  },
};
