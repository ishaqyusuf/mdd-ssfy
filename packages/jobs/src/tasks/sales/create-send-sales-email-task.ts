import { logger, schemaTask, tasks } from "@trigger.dev/sdk/v3";
import {
	type SendSalesEmailPayload,
	sendSalesEmailSchema,
} from "./send-sales-email-schema";

type SalesEmailTaskId =
	| "sales-rep-payment-received-notification"
	| "send-sales-email";

type LoadedSale = {
	customerEmail: string | null | undefined;
	id: number;
	orderId: string;
	customerName: string | null | undefined;
	salesRepEmail: string | null | undefined;
	salesRepId: number | null | undefined;
};

function normalizeText(value: string | null | undefined) {
	return value?.trim() || null;
}

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
		const customerEmail =
			normalizeText(sale.customer?.email) ||
			normalizeText(sale.billingAddress?.email);
		const businessName = normalizeText(sale.customer?.businessName);
		const customerName =
			normalizeText(sale.customer?.name) ||
			businessName ||
			normalizeText(sale.billingAddress?.name);

		return {
			customerEmail,
			id: sale.id,
			orderId: sale.orderId,
			customerName,
			salesRepEmail: normalizeText(sale.salesRep?.email),
			salesRepId: sale.salesRep?.id,
		} satisfies LoadedSale;
	});

	logger.log(`Sending ${sales.length} emails...`);

	const grouped: Record<string, LoadedSale[]> = {};
	const skippedSales: {
		id: number;
		orderId: string;
		customerEmail: string | null | undefined;
		customerName: string | null | undefined;
		salesRepEmail: string | null | undefined;
		salesRepId: number | null | undefined;
		reasons: string[];
	}[] = [];
	for (const sale of sales) {
		const reasons: string[] = [];

		if (!sale.customerEmail) reasons.push("missing_customer_email");
		if (!sale.customerName) reasons.push("missing_customer_name");
		if (!sale.salesRepEmail) reasons.push("missing_sales_rep_email");
		if (!sale.salesRepId) reasons.push("missing_sales_rep_id");

		if (reasons.length) {
			skippedSales.push({
				id: sale.id,
				orderId: sale.orderId,
				customerEmail: sale.customerEmail,
				customerName: sale.customerName,
				salesRepEmail: sale.salesRepEmail,
				salesRepId: sale.salesRepId,
				reasons,
			});
			continue;
		}

		const recipientEmail = sale.customerEmail as string;

		if (!grouped[recipientEmail]) {
			grouped[recipientEmail] = [];
		}

		grouped[recipientEmail]?.push(sale);
	}

	if (skippedSales.length) {
		logger.warn("Skipping sales emails with incomplete recipient metadata", {
			skippedCount: skippedSales.length,
			skippedSales,
		});
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
			const data = await loadSales(props);

			logger.info(`Received data: ${JSON.stringify(data)}`);
			if (!data) {
				throw new Error(`No data found ${JSON.stringify(props)}`);
			}

			const [{ NotificationService }, { db }] = await Promise.all([
				import("@gnd/notifications/services/triggers"),
				import("@gnd/db"),
			]);
			const notification = new NotificationService(tasks, {
				db,
				userId: null,
			});

			for (const matchingSales of data.mailables) {
				const salesIds = matchingSales.map((sale) => sale.id);
				const authorId = matchingSales[0]?.salesRepId;
				if (!authorId) {
					logger.warn("Skipping sales email group without author", {
						id,
						salesIds,
					});
					continue;
				}
				logger.log("Routing sales email through notification system", {
					id,
					salesIds,
					printType: props.printType,
				});
				await notification.send("simple_sales_document_email", {
					author: {
						id: authorId,
						role: "employee",
					},
					payload: {
						emailType: props.emailType,
						printType: props.printType,
						salesIds,
					},
				});
			}
		},
	});
}
