import { z } from "zod";
// import { salesQueryParamsSchema } from "@api/schemas/sales";
export const exampleTaskPayload = z.object({});
export type ExampleTaskPayload = z.infer<typeof exampleTaskPayload>;

export const sendSalesEmailSchema = z.object({
  emailType: z
    .enum(["with payment", "with part payment", "without payment"])
    .default("without payment")
    .optional()
    .nullable(),
  salesIds: z.array(z.number()).optional().nullable(),
  salesNos: z.array(z.string()).optional().nullable(),
});
export type SendSalesEmailPayload = z.infer<typeof sendSalesEmailSchema>;
