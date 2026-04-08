import { db } from "@gnd/db";
import {
	type SendSalesReminderPayload,
	sendSalesReminderSchema,
} from "../../schema";
import { processBatch } from "../../utils/process-batch";
import type { NotificationJobInput } from "@notifications/schemas";
import { logger, schemaTask, tasks } from "@trigger.dev/sdk/v3";
import { getAppApiUrl, getAppUrl } from "@utils/envs";
const baseAppUrl = getAppUrl();
const baseApiUrl = getAppApiUrl();
export const sendSalesReminder = schemaTask({
	id: "send-sales-reminder",
	schema: sendSalesReminderSchema,
	maxDuration: 120,
	queue: {
		concurrencyLimit: 10,
	},
	run: async (props) => {
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
					const authorId = props.salesRepId || data.data?.[0]?.salesRepId;
					if (!authorId) {
						throw new Error(
							`Missing salesRepId for reminder payload: ${JSON.stringify(data)}`,
						);
					}
					await tasks.trigger("notification", {
						channel: "sales_email_reminder",
						author: {
							id: authorId,
							role: "employee",
						},
						payload: {
							type: data.type,
							customerEmail: data.customerEmail,
							customerName: data.customerName,
							salesRep: props.salesRep,
							salesRepEmail: props.salesRepEmail,
							pdfLink: data.downloadToken
								? `${baseApiUrl}/download/sales?token=${data.downloadToken}&download=true`
								: null,
							paymentLink: data.paymentToken
								? `${baseAppUrl}/checkout/${data.paymentToken}/v2`
								: null,
							sales: data.data.map((sale) => ({
								orderId: sale.orderId,
								po: sale.po,
								date: sale.date,
								total: sale.total,
								due: sale.due,
							})),
						},
					} satisfies NotificationJobInput);
				}),
			);
		});
	},
});
async function loadSales(props: SendSalesReminderPayload) {
	// const { emailType, salesIds, salesNos } = props;
	// if (!salesIds?.length && !salesNos?.length)
	//   throw Error("Invalid sales information");
	const salesIds = props.sales.flatMap((a) => a.salesIds);
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
						id: true,
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
    const customerEmail = sale?.customer?.email || sale?.billingAddress?.email;
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
      salesRep: sale?.salesRep?.name,
			salesRepId: sale?.salesRep?.id,
			salesRepEmail: sale?.salesRep?.email,
			customerName: sale?.customer?.name || sale?.billingAddress?.name,
			businessName: sale?.customer?.businessName,
		};
	});
	logger.log(`Preparing ${sales.length} sales reminder records...`);

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
