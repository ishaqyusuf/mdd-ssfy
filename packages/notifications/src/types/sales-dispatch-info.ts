import type { NotificationHandler } from "../base";
import {
  type SalesDispatchInfoInput,
  type SalesDispatchInfoTags,
  salesDispatchInfoSchema,
} from "../schemas";

export const salesDispatchInfo: NotificationHandler = {
  schema: salesDispatchInfoSchema,
  createActivityWithoutContact: true,
  createActivity(data: SalesDispatchInfoInput, author) {
    const payload: SalesDispatchInfoTags = {
      type: "sales_dispatch_info",
      source: "user",
      priority: 5,
      dispatchId: data.dispatchId,
    };

    return {
      type: "sales_dispatch_info",
      source: "user",
      subject: "Sales dispatch info",
      headline: data.headline,
      color: data.color,
      authorId: author.id,
      tags: payload,
    };
  },
};
