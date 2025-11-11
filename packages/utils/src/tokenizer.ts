import z from "zod";
import { jwtDecrypt, jwtEncrypt } from "./jwt";

type XOR<T, U> = T | U extends object
  ? Exclude<keyof T, keyof U> extends never
    ? never
    : Exclude<keyof U, keyof T> extends never
    ? never
    : T | U
  : T | U;
export const salesPdfToken = z.object({
  salesIds: z.array(z.number()),
  expiry: z.string(),
  mode: z.string(),
  dispatchId: z.number().optional().nullable(),
});
export type SalesPdfToken = z.infer<typeof salesPdfToken>;
export const salesPaymentTokenSchema = z.object({
  salesIds: z.array(z.number()),
  expiry: z.string(),
  percentage: z.number().optional().nullable(),
  walletId: z.number(),
  amount: z.number().optional().nullable(),
  paymentId: z.string().optional().nullable(),
});
export const tokenSchemas = {
  salesPdfToken,
  salesPaymentTokenSchema,
} as const;
export type TokenSchemaNames = keyof typeof tokenSchemas;
export type SalesPaymentTokenSchema = z.infer<typeof salesPaymentTokenSchema>;
export function tokenize<T extends XOR<SalesPdfToken, SalesPaymentTokenSchema>>(
  data: T
) {
  return jwtEncrypt(data);
}
export function validateToken<T>(
  data: string,
  schema: z.ZodSchema<T>
): T | null {
  try {
    const result = jwtDecrypt(data);
    const parsed = schema.safeParse(result);
    if (!parsed.success) return null;
    return parsed.data;
  } catch {
    return null;
  }
}
