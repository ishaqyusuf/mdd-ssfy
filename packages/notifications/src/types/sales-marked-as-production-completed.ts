import type { NotificationHandler, UserData } from "../base";
import {
  type SalesMarkedAsProductionCompletedInput,
  type SalesMarkedAsProductionCompletedTags,
  salesMarkedAsProductionCompletedSchema,
} from "../schemas";

export const salesMarkedAsProductionCompleted: NotificationHandler = {
  schema: salesMarkedAsProductionCompletedSchema,
  createActivity(
    data: SalesMarkedAsProductionCompletedInput,
    author: UserData,
    _contact: UserData,
  ) {
    const payload: SalesMarkedAsProductionCompletedTags = {
      type: "sales_marked_as_production_completed",
      source: "user",
      priority: 5,
      salesId: data.salesId,
      orderNo: data.orderNo,
    };

    return {
      type: "sales_marked_as_production_completed",
      source: "user",
      subject: "Production marked completed",
      headline: `Order ${data.orderNo || data.salesId} was marked as production completed.`,
      authorId: author.id,
      tags: payload,
    };
  },
  createWhatsApp(data) {
    return {
      message: `Order ${data.orderNo || data.salesId} has been marked as production completed.`,
    };
  },
};
