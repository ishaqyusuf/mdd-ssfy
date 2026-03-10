import type { SalesPaymentTokenSchema, SalesPdfToken } from "@gnd/utils/tokenizer";
import { addDays } from "date-fns";
import type { SalesType } from "../types";
import type { SalesPrintModes } from "src/constants";

export type SalesReminderDraft = {
  type: SalesType;
  amount?: number;
  ids: number[];
  walletId: number | null | undefined;
  mode?: SalesPrintModes;
  customer: {
    name: string;
    email: string;
  };
};

export type BuildSalesReminderTaskPayloadInput = {
  auth: {
    id?: number | string | null;
    name: string;
    email: string;
  };
  tokenGeneratorFn: (
    payload: SalesPdfToken | SalesPaymentTokenSchema,
  ) => Promise<string>;
  data: SalesReminderDraft[];
};

export async function buildSalesReminderTaskPayload(
  input: BuildSalesReminderTaskPayloadInput,
) {
  const { auth, data, tokenGeneratorFn: generateToken } = input;
  const parsedSalesRepId =
    auth.id == null ? undefined : Number(auth.id);
  const salesRepId = Number.isFinite(parsedSalesRepId)
    ? parsedSalesRepId
    : undefined;

  const payload = {
    salesRepId,
    salesRepEmail: auth.email,
    salesRep: auth.name,
    sales: [] as Array<{
      type: SalesType;
      salesIds: number[];
      customerEmail: string;
      customerName: string;
      downloadToken: string | null;
      paymentToken: string | null;
    }>,
  };

  const expiry = addDays(new Date(), 7).toISOString();

  for (const sale of data) {
    const mode = sale.mode || "order";

    const downloadToken = await generateToken({
      salesIds: sale.ids,
      expiry,
      mode,
    } satisfies SalesPdfToken);

    const paymentToken = !sale.amount
      ? null
      : await generateToken({
          salesIds: sale.ids,
          expiry,
          amount: sale.amount,
          walletId: sale.walletId,
        } satisfies SalesPaymentTokenSchema);

    payload.sales.push({
      type: sale.type,
      salesIds: sale.ids,
      customerEmail: sale.customer.email,
      customerName: sale.customer.name,
      downloadToken,
      paymentToken,
    });
  }

  return payload;
}
