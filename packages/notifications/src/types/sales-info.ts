import type { NotificationHandler } from "../base";
import {
  type SalesInfoInput,
  type SalesInfoTags,
  salesInfoSchema,
} from "../schemas";

export const salesInfo: NotificationHandler = {
  schema: salesInfoSchema,
  createActivityWithoutContact: true,
  createActivity(data: SalesInfoInput, author) {
    const payload: SalesInfoTags = {
      type: "sales_info",
      source: "user",
      priority: 5,
      salesId: data.salesId,
      salesNo: data.salesNo,
    };

    return {
      type: "sales_info",
      source: "user",
      subject: "Sales Note",
      headline: data.headline || `Sale ${data.salesNo}`,
      note: data.note,
      color: data.color,
      authorId: author.id,
      tags: payload,
    };
  },
};
