import { z } from "zod";
// import { salesQueryParamsSchema } from "@api/schemas/sales";
export const exampleTaskPayload = z.object({});
export type ExampleTaskPayload = z.infer<typeof exampleTaskPayload>;

export const sendSalesEmailSchema = z.object({
  //   query: salesQueryParamsSchema,
});
export type SendSalesEmailPayload = z.infer<typeof sendSalesEmailSchema>;
