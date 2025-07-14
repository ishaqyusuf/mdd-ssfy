import { SendSalesEmailPayload, sendSalesEmailSchema } from "@jobs/schema";
import { logger, schemaTask } from "@trigger.dev/sdk/v3";
import { db } from "@gnd/db";
import { processBatch } from "@jobs/utils/process-batch";
import { sum } from "@gnd/utils";
import { resend } from "@jobs/utils/resend";
import { nanoid } from "nanoid";
import { render } from "@react-email/render";
import { SalesEmail } from "@gnd/email/emails/sales-email";
import { getAppUrl } from "@gnd/utils/envs";
import QueryString from "qs";
import { composePaymentOrderIdsParam } from "@gnd/utils/sales";
const baseAppUrl = getAppUrl();
export const sendSalesEmail = schemaTask({
  id: "send-sales-email",
  schema: sendSalesEmailSchema,
  maxDuration: 120,
  queue: {
    concurrencyLimit: 10,
  },
  run: async (props) => {
    const isDev = process.env.NODE_ENV === "development";
    const data = await loadSales(props);
    logger.info(`Received data: ${JSON.stringify(data)}`);
    if (!data) {
      throw new Error("No data found");
    }
    const { mailables, sales } = data;

    // @ts-expect-error
    await processBatch(mailables, 1, async (batch) => {
      await Promise.all(
        batch.map(async (matchingSales) => {
          logger.log(`Processing sales: ${matchingSales[0]?.id}`);
          const email = matchingSales[0]?.customerEmail;
          const customerName = matchingSales[0]?.customerName;
          const isQuote = matchingSales[0]?.isQuote;
          let emailSlug = email?.split("@")[0];
          const salesRepEmail = matchingSales?.[0]?.salesRepEmail;
          const salesRep = matchingSales?.[0]?.salesRep;
          const pendingAmountSales = matchingSales.filter((s) => s.due! > 0);
          const totalDueAmount = sum(pendingAmountSales, "due");

          const slugs = matchingSales.map((s) => s.orderId).join(",");
          const pdfLink = `${baseAppUrl}/api/pdf/download?${QueryString.stringify(
            {
              slugs,
              mode: props.printType,
              preview: false,
            },
          )}`;
          let pid = null;
          const orderIdParams = composePaymentOrderIdsParam(
            matchingSales.map((a) => a.orderId),
          );
          if (totalDueAmount) {
            pid = (
              await db.squarePaymentLink.create({
                data: {
                  option: props.emailType as any,
                  orderIdParams,
                },
              })
            )?.id;
          }
          const paymentLink =
            !totalDueAmount || props.printType == "quote"
              ? null
              : isDev
                ? `${baseAppUrl}/square-payment/checkout?uid=${pid}&slugs=${slugs}&tok=${emailSlug}`
                : `${baseAppUrl}/square-payment/${emailSlug}/${orderIdParams}?uid=${pid}`;
          logger.log(`Sending email to ${email}`);

          const response = await resend.emails.send({
            subject: `${salesRep} sent you ${isQuote ? "a quote" : "an invoice"}`,
            from: `GND Millwork <${salesRepEmail?.split("@")[0]}@gndprodesk.com>`,
            to: isDev
              ? [
                  "ishaqyusuf024@gmail.com",
                  // "pcruz321@gmail.com"
                ]
              : email!,
            replyTo: salesRepEmail,
            headers: {
              "X-Entity-Ref-ID": nanoid(),
            },
            html: render(
              <SalesEmail
                isQuote
                pdfLink={pdfLink}
                paymentLink={paymentLink!}
                sales={matchingSales.map((s) => ({
                  due: s.due,
                  total: s.total,
                  date: s.date,
                  orderId: s.orderId,
                  po: s.po,
                }))}
                customerName={customerName!}
              />,
            ),
          });
          if (response.error) {
            logger.error("Invoice email failed to send", {
              error: response.error,
              invoiceIds: matchingSales.map((a) => a.id),
            });
            throw new Error("Invoice email failed to send");
          }
          logger.info("Invoice email sent");
        }),
      );
    });
  },
});
async function loadSales(props: SendSalesEmailPayload) {
  const { emailType, salesIds, salesNos } = props;
  if (!salesIds?.length && !salesNos?.length)
    throw Error("Invalid sales information");
  const sales = (
    await db.salesOrders.findMany({
      where: {
        id: salesIds?.length ? { in: salesIds } : undefined,
        orderId: salesNos?.length ? { in: salesNos } : undefined,
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
  let grouped: { [email in string]: typeof sales } = {};
  for (const sale of sales) {
    if (!sale.customerEmail) return;
    if (!grouped[sale.customerEmail]) {
      grouped[sale.customerEmail] = [];
    }
    grouped[sale.customerEmail]?.push(sale);
  }
  return {
    mailables: Object.values(grouped),
    sales,
  };
}
