import { logger, schemaTask } from "@trigger.dev/sdk/v3";
import { sum } from "@gnd/utils";
import { processBatch } from "../../utils/process-batch";
import {
  type SendSalesEmailPayload,
  sendSalesEmailSchema,
} from "./send-sales-email-schema";

type SalesEmailTaskId =
  | "sales-rep-payment-received-notification"
  | "send-sales-email";

type SalesRecord = {
  customerEmail: string | null | undefined;
  po: string | null | undefined;
  id: number;
  type: string | null | undefined;
  isQuote: boolean;
  due: number;
  total: number;
  date: Date;
  orderId: string;
  salesRep: string | null | undefined;
  salesRepEmail: string | null | undefined;
  customerName: string | null | undefined;
  businessName: string | null | undefined;
};

type SalesEmailTemplateProps = {
  isQuote?: boolean;
  customerName: string;
  paymentLink?: string;
  pdfLink?: string;
  sales: {
    orderId: string;
    po?: string | null;
    date: Date;
    total: number;
    due: number;
  }[];
};

async function loadSales(props: SendSalesEmailPayload) {
  const { db } = await import("@gnd/db");
  const { salesIds, salesNos } = props;

  if (!salesIds?.length && !salesNos?.length) {
    throw new Error("Invalid sales information");
  }

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
    const po = (sale.meta as { po?: string | null } | null)?.po;
    const customerEmail = sale.customer?.email || sale.billingAddress?.email;

    return {
      customerEmail,
      po,
      id: sale.id,
      type: sale.type,
      isQuote: sale.type === "quote",
      due: sale.amountDue || 0,
      total: sale.grandTotal || 0,
      date: sale.createdAt || new Date(),
      orderId: sale.orderId,
      salesRep: sale.salesRep?.name,
      salesRepEmail: sale.salesRep?.email,
      customerName: sale.customer?.name || sale.billingAddress?.name,
      businessName: sale.customer?.businessName,
    } satisfies SalesRecord;
  });

  logger.log(`Sending ${sales.length} emails...`);

  const grouped: Record<string, SalesRecord[]> = {};
  for (const sale of sales) {
    if (!sale.customerEmail) {
      return;
    }

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

export function createSendSalesEmailTask(id: SalesEmailTaskId) {
  return schemaTask({
    id,
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
        throw new Error(`No data found ${JSON.stringify(props)}`);
      }

      const [{ db }, { sendEmail }, salesEmailModule, { getAppUrl }] =
        await Promise.all([
          import("@gnd/db"),
          import("../../utils/resend.js"),
          import("@gnd/email/emails/sales-email"),
          import("../../../../utils/src/envs.js"),
        ]);

      const baseAppUrl = getAppUrl();
      const { default: QueryString } = await import("qs");
      const { composePaymentOrderIdsParam } = await import("@gnd/utils/sales");
      const SalesEmail = salesEmailModule.default as unknown as (
        props: SalesEmailTemplateProps,
      ) => unknown;
      const { mailables } = data;

      // @ts-expect-error Existing batch callback types are broader than our grouped sales records.
      await processBatch(mailables, 1, async (batch) => {
        await Promise.all(
          batch.map(async (matchingSales: SalesRecord[]) => {
            logger.log(`Processing sales: ${matchingSales[0]?.id}`);
            const email = matchingSales[0]?.customerEmail;
            const customerName = matchingSales[0]?.customerName;
            const isQuote = matchingSales[0]?.isQuote;
            const emailSlug = email?.split("@")[0];
            const salesRepEmail = matchingSales[0]?.salesRepEmail;
            const salesRep = matchingSales[0]?.salesRep;
            const pendingAmountSales = matchingSales.filter((s) => s.due > 0);
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
              matchingSales.map((sale) => sale.orderId),
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
              !totalDueAmount || props.printType === "quote"
                ? null
                : isDev
                  ? `${baseAppUrl}/square-payment/checkout?uid=${pid}&slugs=${slugs}&tok=${emailSlug}`
                  : `${baseAppUrl}/square-payment/${emailSlug}/${orderIdParams}?uid=${pid}`;

            const sales = matchingSales.map((sale) => ({
              due: sale.due,
              total: sale.total,
              date: sale.date,
              orderId: sale.orderId,
              po: sale.po,
            }));

            logger.log(`Sending email to ${email}`, { sales });

            await sendEmail({
              subject: `${salesRep} sent you ${isQuote ? "a quote" : "an invoice"}`,
              from: `GND Millwork <${
                salesRepEmail?.split("@")[0]
              }@gndprodesk.com>` as any,
              to: email!,
              content: SalesEmail({
                isQuote,
                pdfLink,
                paymentLink: paymentLink!,
                sales,
                customerName: customerName!,
              }),
              successLog: "Invoice email sent",
              errorLog: "Invoice email failed to send",
              task: {
                id,
                payload: props,
              },
            });
          }),
        );
      });
    },
  });
}
