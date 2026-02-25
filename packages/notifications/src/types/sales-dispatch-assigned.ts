import type { NotificationHandler, UserData } from "../base";
import {
  SalesDispatchAssignedInput,
  salesDispatchAssignedSchema,
} from "../schemas";

export const salesDispatchAssigned: NotificationHandler = {
  schema: salesDispatchAssignedSchema,
  createActivity(
    data: SalesDispatchAssignedInput,
    author: UserData,
    contact: UserData,
  ) {
    const { orderNo, dispatchId, deliveryMode, dueDate, driverId } = data;
    return {
      type: "sales_dispatch_assigned",
      source: "user",
      subject: `Dispatch assigned`,
      headline: `Dispatch ${dispatchId} for order ${orderNo} has been assigned to you. Delivery mode: ${deliveryMode}.`,
      authorId: author.id,
      tags: {
        dispatchId,
      },
    };
  },
  createEmail(data, author, user, args) {
    return {
      ...args,
      template: "sales-dispatch-assigned",
      to: [user.email],
      subject: `New Dispatch Assigned: Order ${data.orderNo}`,
      data: {},
    };
  },
};
