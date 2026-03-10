import type { NotificationHandler } from "../base";
import {
  type SalesItemInfoInput,
  type SalesItemInfoTags,
  salesItemInfoSchema,
} from "../schemas";

export const salesItemInfo: NotificationHandler = {
  schema: salesItemInfoSchema,
  createActivityWithoutContact: true,
  createActivity(data: SalesItemInfoInput, author) {
    const payload: SalesItemInfoTags = {
      type: "sales_item_info",
      source: "user",
      priority: 5,
      salesId: data.salesId,
      salesNo: data.salesNo,
      itemId: data.itemId,
      itemControlId: data.itemControlId,
    };

    return {
      type: "sales_item_info",
      source: "user",
      subject: "Sales item info",
      headline: data.headline,
      color: data.color,
      authorId: author.id,
      tags: payload,
    };
  },
};
