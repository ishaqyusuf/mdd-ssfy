import { ISalesOrder } from "@/types/sales";

// const exam: ISalesOrder = {} as any;
// exam.meta.qb;
export const salesShortCodes = [
  "orderId",
  //   "estimateId",
  //   "qbOrderId",
  // "paymentLink",
  "customer.name",
  "shippingAddress.address1",
  "billingAddress.address1",
  // "amountPaid",
  "amountDue",
  "grandTotal",
  "prodDueDate",
  "meta.qb",
];
