import { timeout } from "@gnd/utils";
import { SalesPaymentTokenSchema, SalesPdfToken } from "@gnd/utils/tokenizer";
import { addDays } from "date-fns";
import { SalesType } from "../types";
import { SalesPrintModes } from "src/constants";
interface Props {
  tokenGeneratorFn;
  trigger?;
  data: {
    type: SalesType;
    amount?: number;
    ids: number[];
    mode?: SalesPrintModes;
    customer: {
      name: string;
      email: string;
    };
  }[];
  auth;
}
export async function sendSalesEmail(props: Props) {
  const { auth, data, trigger, tokenGeneratorFn: generateToken } = props;
  const payload: any = {
    salesRepEmail: auth.email,
    salesRep: auth.name,
    sales: [],
  };
  const expiry = addDays(new Date(), 7).toISOString();
  for (const sale of data) {
    if (!sale.mode) sale.mode = "order";
    const downloadToken = await generateToken({
      salesIds: sale.ids,
      expiry,
      mode: sale.mode,
    } satisfies SalesPdfToken);
    const paymentToken = !sale.amount
      ? null
      : await generateToken({
          salesIds: sale.ids,
          expiry,
          amount: sale.amount!,
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
  console.log(payload);
  trigger.trigger({
    taskName: "send-sales-reminder",
    payload,
  });
}
