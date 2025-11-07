import {
  SendSalesReminderPayload,
  sendSalesReminderSchema,
  TaskName,
} from "@jobs/schema";
import { logger, schemaTask } from "@trigger.dev/sdk/v3";
import { db } from "@gnd/db";
import { processBatch } from "@jobs/utils/process-batch";
import { sendEmail } from "@jobs/utils/resend";
import SalesEmail from "@gnd/email/emails/sales-email";
import { getAppApiUrl, getAppUrl } from "@utils/envs";
const baseAppUrl = getAppUrl();
const baseApiUrl = getAppApiUrl();
const id = "send-sales-email" as TaskName;
export const sendSalesReminder = schemaTask({
  id: "send-sales-reminder",
  schema: sendSalesReminderSchema,
  maxDuration: 120,
  queue: {
    concurrencyLimit: 10,
  },
  run: async (props) => {
    const isDev = process.env.NODE_ENV === "development";
    const data = await loadSales(props);
    logger.info(`Received data: ${JSON.stringify(data)}`);
    if (!data) {
      throw new Error(`No data found ${JSON.stringify(props)}`);
    }
    const { mailables } = data;

    // @ts-expect-error
    await processBatch(mailables, 1, async (batch) => {
      await Promise.all(
        batch.map(async (data) => {
          logger.log(`Processing sales: ${data}`);
          const isQuote = data.type == "quote";
          await sendEmail({
            subject: `${props.salesRep} sent you ${
              isQuote ? "a quote" : "an invoice"
            }`,
            from: `GND Millwork <${
              props.salesRepEmail?.split("@")[0]
            }@gndprodesk.com>` as any,
            to: data.customerEmail!,
            content: SalesEmail({
              isQuote,
              pdfLink: data.downloadToken
                ? `${baseApiUrl}/download/sales?token=${data.downloadToken}&download=true`
                : undefined,
              paymentLink: data.paymentToken
                ? `${baseAppUrl}/checkout/${data.paymentToken}`
                : undefined,
              //  paymentLink: paymentLink!,
              sales: data.data,
              customerName: data.customerName!,
            }),
            successLog: "Invoice email sent",
            errorLog: "Invoice email failed to send",
            task: {
              id,
              payload: props,
            },
          });
        })
      );
    });
  },
});
async function loadSales(props: SendSalesReminderPayload) {
  // const { emailType, salesIds, salesNos } = props;
  // if (!salesIds?.length && !salesNos?.length)
  //   throw Error("Invalid sales information");
  const salesIds = props.sales.map((a) => a.salesIds).flat();
  const sales = (
    await db.salesOrders.findMany({
      where: {
        id: salesIds?.length ? { in: salesIds } : undefined,
        // orderId: salesNos?.length ? { in: salesNos } : undefined,
      },
      select: {
        slug: true,
        id: true,
        type: true,
        amountDue: true,
        meta: true,
        grandTotal: true,
        createdAt: true,
        orderId: true,
        salesRep: {
          select: {
            name: true,
            email: true,
          },
        },
        customer: {
          select: {
            email: true,
            name: true,
            businessName: true,
          },
        },
        billingAddress: {
          select: {
            email: true,
            name: true,
          },
        },
      },
    })
  ).map((sale) => {
    const po = (sale?.meta as any)?.po;
    const customerEmail = sale?.customer?.email || sale?.billingAddress?.email;
    return {
      customerEmail,
      po,
      id: sale.id,
      type: sale.type,
      isQuote: sale.type == "quote",
      due: sale.amountDue!,
      total: sale.grandTotal!,
      date: sale.createdAt!,
      orderId: sale.orderId,
      salesRep: sale?.salesRep?.name,
      salesRepEmail: sale?.salesRep?.email,
      customerName: sale?.customer?.name || sale?.billingAddress?.name,
      businessName: sale?.customer?.businessName,
    };
  });
  logger.log(`Sending ${sales.length} emails...`);

  // group by customerEmail
  // let grouped: { [email in string]: typeof sales } = {};
  // for (const sale of sales) {
  //   if (!sale.customerEmail) return;
  //   if (!grouped[sale.customerEmail]) {
  //     grouped[sale.customerEmail] = [];
  //   }
  //   grouped[sale.customerEmail]?.push(sale);
  // }
  // return {
  //   mailables: Object.values(grouped),
  //   sales,
  // };
  return {
    mailables: props.sales.map((s) => {
      return {
        ...s,
        data: sales.filter((o) => s.salesIds.includes(o.id)),
      };
    }),
  };
}
