import z from "zod";
import { decrypt, encrypt } from "./encrypt";

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
export type SalesPdfToken = typeof salesPdfToken._type;
export const salesPaymentTokenSchema = z.object({
  salesIds: z.array(z.number()),
  percentage: z.number().optional().nullable(),
  amount: z.number().optional().nullable(),
  expiry: z.string(),
});
export const tokenSchemas = {
  salesPdfToken,
  salesPaymentTokenSchema,
} as const;
export type TokenSchemaNames = keyof typeof tokenSchemas;
export type SalesPaymentTokenSchema = typeof salesPaymentTokenSchema._type;
export function tokenize<T extends XOR<SalesPdfToken, SalesPaymentTokenSchema>>(
  data: T
) {
  return encrypt(data);
}
export function validateToken<T>(
  data: string,
  schema: z.ZodSchema<T>
): T | null {
  try {
    const result = decrypt(data);
    const parsed = schema.safeParse(result);
    if (!parsed.success) return null;
    return parsed.data;
  } catch {
    return null;
  }
}
