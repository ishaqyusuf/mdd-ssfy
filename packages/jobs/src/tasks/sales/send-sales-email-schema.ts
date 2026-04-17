import { z } from "zod";

export const sendSalesEmailSchema = z.object({
  emailType: z
    .enum(["with payment", "with part payment", "without payment"])
    .default("with payment")
    .optional()
    .nullable(),
  printType: z.enum(["order", "quote"]),
  salesIds: z.array(z.number()).optional().nullable(),
  salesNos: z.array(z.string()).optional().nullable(),
});

export type SendSalesEmailPayload = z.infer<typeof sendSalesEmailSchema>;
