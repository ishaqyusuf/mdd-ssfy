import { timeout } from "@gnd/utils";
import {
  SalesPaymentTokenSchema,
  SalesPdfToken,
  TokenSchemaNames,
  tokenSchemas,
} from "@gnd/utils/tokenizer";
import { addDays } from "date-fns";
import { SalesType } from "../types";
import { SalesPrintModes } from "src/constants";
interface Props {
  tokenGeneratorFn;
  validateTokenFn?;
  trigger?;
  data: {
    type: SalesType;
    amount?: number;
    ids: number[];
    walletId;
    mode?: SalesPrintModes;
    customer: {
      name: string;
      email: string;
    };
  }[];
  auth;
}
export async function sendSalesEmail(props: Props) {
  const {
    auth,
    data,
    trigger,
    validateTokenFn: validateToken,
    tokenGeneratorFn: generateToken,
  } = props;
  const payload: any = {
    salesRepEmail: auth.email,
    salesRep: auth.name,
    sales: [],
  };
  const expiry = addDays(new Date(), 7).toISOString();
  for (const sale of data) {
    if (!sale.mode) sale.mode = "order";
    console.log({ sale });
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
          walletId: sale?.walletId,
        } satisfies SalesPaymentTokenSchema);
    // if (paymentToken) {
    //   console.log({
    //     paymentToken,
    //     v: await validateToken(
    //       paymentToken,
    //       "salesPaymentTokenSchema" as TokenSchemaNames
    //     ),
    //   });
    // }
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
