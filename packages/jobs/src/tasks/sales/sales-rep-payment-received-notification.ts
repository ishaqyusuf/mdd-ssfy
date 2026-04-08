import { createSendSalesEmailTask } from "./create-send-sales-email-task";

export const salesRepPaymentReceivedNotification = createSendSalesEmailTask(
  "sales-rep-payment-received-notification",
);
