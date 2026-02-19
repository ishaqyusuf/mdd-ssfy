import { NotificationHandler, UserData } from "../base";
import {
  SalesDispatchAssignedInput,
  salesDispatchAssignedSchema,
} from "../schemas";

export const salesDispatchAssigned: NotificationHandler = {
  schema: salesDispatchAssignedSchema,
  createActivity(data: SalesDispatchAssignedInput, contact: UserData) {
    const { orderNo, dispatchId, deliveryMode, dueDate, driverId } = data;
    return {
      type: "sales_dispatch_assigned",
      source: "user",
      subject: `Dispatch assigned: ${data.orderNo}`,
      // note: `Dispatch ${data.dispatchId} has been assigned to driver ${data.assignedToName || data.assignedToId}. Delivery mode: ${data.deliveryMode}.`,
      tags: {
        dispatchId,
      },
    };
  },
  // createEmail(data, user) {

  // },
};
