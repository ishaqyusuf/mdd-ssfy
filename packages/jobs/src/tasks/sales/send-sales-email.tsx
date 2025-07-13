import { SendSalesEmailPayload, sendSalesEmailSchema } from "@jobs/schema";
import { logger, schemaTask } from "@trigger.dev/sdk/v3";
import { db } from "@gnd/db";
import { processBatch } from "@jobs/utils/process-batch";
import { sum } from "@gnd/utils";
import { resend } from "@jobs/utils/resend";
import { nanoid } from "nanoid";
import { render } from "@react-email/render";
import { SalesEmail } from "@gnd/email/emails/sales-email";
export const sendSalesEmail = schemaTask({
  id: "send-sales-email",
  schema: sendSalesEmailSchema,
  maxDuration: 120,
  queue: {
    concurrencyLimit: 10,
  },
  run: async (props) => {
    const { mailables } = (await loadSales(props))!;
    // @ts-expect-error
    await processBatch(mailables, 1, async (batch) => {
      await Promise.all(
        batch.map(async (matchingSales) => {
          const email = matchingSales[0]?.customerEmail;
          const isQuote = matchingSales[0]?.isQuote;
          let emailSlug = email?.split("@")[0];
          const isDev = process.env.NODE_ENV === "development";
          const salesRepEmail = matchingSales?.[0]?.salesRepEmail;
          const salesRep = matchingSales?.[0]?.salesRep;
          const pendingAmountSales = matchingSales.filter(
            (s) => s.amountDue! > 0,
          );
          const totalDueAmount = sum(pendingAmountSales, "amountDue");

          const response = await resend.emails.send({
            subject: `${salesRep} sent you ${isQuote ? "a quote" : "an invoice"}`,
            from: `GND Millwork <${salesRepEmail?.split("@")[0]}@gndprodesk.com>`,
            to: email!,
            replyTo: salesRepEmail,
            headers: {
              "X-Entity-Ref-ID": nanoid(),
            },
            html: render(<SalesEmail isQuote />),
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
      amountDue: sale.amountDue,
      grandTotal: sale.grandTotal,
      orderId: sale.orderId,
      salesRep: sale?.salesRep?.name,
      salesRepEmail: sale?.salesRep?.email,
      customerName: sale?.customer?.name || sale?.billingAddress?.name,
      businessName: sale?.customer?.businessName,
    };
  });
  // group by customerEmail
  let grouped: { [email in string]: typeof sales } = {};
  for (const sale of sales) {
    if (!sale.customerEmail) return;
    if (!grouped[sale.customerEmail]) {
      grouped[sale.customerEmail] = [];
    } else grouped[sale.customerEmail]?.push(sale);
  }
  return {
    mailables: Object.values(grouped),
    sales,
  };
}
