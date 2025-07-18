import { z } from "zod";
export function formatPaymentParams(params: any) {
  const { emailToken, orderIds } = params;
  return {
    emailToken,
    orderIdsParam: orderIds,
    orderIds: transformPaymentOrderIds(orderIds),
    paymentId: params.paymentId,
  };
}

export function transformPaymentOrderIds(orderIds: string): string[] {
  return orderIds?.split("-").map((a) => a.replaceAll("_", "-"));
}
export function composePaymentOrderIdsParam(orderIds: string[]) {
  return orderIds
    ?.filter(Boolean)
    .map((a) => a?.replaceAll("-", "_"))
    .join("-");
}

export type DeliveryOption = "delivery" | "pickup";
export type SalesDispatchStatus =
  | "queue"
  | "in progress"
  | "completed"
  | "cancelled";
export const createSalesDispatchSchema = z.object({
  id: z.number().optional(),
  deliveryMode: z.string() as z.ZodType<DeliveryOption>,
  status: z.string() as z.ZodType<SalesDispatchStatus>,
  orderId: z.number(),
  driverId: z.number().optional(),
  deliveryDate: z.date().optional(),
  packingList: z.boolean().optional(),
});
export const createSalesDispatchItemsSchema = z.object({
  deliveryMode: z.string(),
  orderId: z.number(),
  deliveryId: z.number(),
  status: z.string().optional() as z.ZodType<SalesDispatchStatus>,
  items: z.record(
    z.object({
      orderItemId: z.number(),
      available: z.object({
        lh: z.number().nullable().optional(),
        rh: z.number().nullable().optional(),
        qty: z.number().nullable().optional(),
      }),
      qty: z.object({
        lh: z.number().nullable().optional(),
        rh: z.number().nullable().optional(),
        qty: z.number().nullable().optional(),
      }),
      submissionId: z.number(),
      status: z.string().optional() as z.ZodType<SalesDispatchStatus>,
      itemUid: z.string(),
      totalItemQty: z.number(),
    }),
  ),
});
export const createSubmissionSchema = z
  .object({
    pending: z.object({
      lh: z.number().nullable().optional(),
      rh: z.number().nullable().optional(),
      qty: z.number().nullable().optional(),
    }),
    qty: z.object({
      lh: z.number().nullable().optional(),
      rh: z.number().nullable().optional(),
      qty: z.number().nullable().optional(),
    }),
    assignmentId: z.number(),
    note: z.string().optional(),
    salesId: z.number(),
    itemId: z.number(),
    submittedById: z.number(),
    itemUid: z.string(),
    // unitWage: z.number().optional(),
  })
  .superRefine(qtySuperRefine);
function qtySuperRefine(data: any, ctx: any) {
  let totalQty = 0;
  // console.log(data?.pending?.);

  ["qty", "lh", "rh"].map((a) => {
    let val = +data.qty?.[a] || 0;
    if (a == "qty" && (data.qty.lh || data.qty.rh)) {
    } else totalQty += val;
    if (val) {
      if (val > data.pending?.[a])
        ctx.addIssue({
          path: [`qty.${a}`],
          message: "Qty can not be more than pending",
          code: "custom",
        });
    }
  });

  if (totalQty == 0)
    ctx.addIssue({
      path: [],
      message: "Qty required",
      code: "custom",
    });
  if (totalQty > data?.pending?.qty)
    ctx.addIssue({
      path: [],
      message: "Qty overload",
      code: "custom",
    });
}
