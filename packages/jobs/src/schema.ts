import { z } from "zod";
// import { salesQueryParamsSchema } from "@api/schemas/sales";

export const taskNames = [
  "send-login-email",
  "send-password-reset-to-default-email",
] as const;
export type TaskName = (typeof taskNames)[number];
export const exampleTaskPayload = z.object({});
export type ExampleTaskPayload = z.infer<typeof exampleTaskPayload>;

export const sendSalesEmailSchema = z.object({
  emailType: z
    .enum(["with payment", "with part payment", "without payment"])
    .default("without payment")
    .optional()
    .nullable(),
  printType: z.enum(["order", "quote"]),
  salesIds: z.array(z.number()).optional().nullable(),
  salesNos: z.array(z.string()).optional().nullable(),
});
export type SendSalesEmailPayload = z.infer<typeof sendSalesEmailSchema>;

export const sendLoginEmailSchema = z.object({
  //validate email
  email: z.string().email("Please enter a valid email address"),
});
export type SendLoginEmailPayload = z.infer<typeof sendLoginEmailSchema>;

export const passwordResetToDefaultSchema = z.object({
  //validate email
  id: z.number(),
});
export type PasswordResetToDefaultSchema = z.infer<
  typeof passwordResetToDefaultSchema
>;
