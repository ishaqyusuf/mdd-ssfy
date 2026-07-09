import { logger, schemaTask } from "@trigger.dev/sdk/v3";
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

function isMissingSalesEmailAttemptTableError(error: unknown) {
	if (!error || typeof error !== "object") return false;

	const prismaError = error as {
		code?: unknown;
		message?: unknown;
		meta?: {
			modelName?: unknown;
			table?: unknown;
		};
	};
	if (prismaError.code !== "P2021") return false;

	const modelName = String(prismaError.meta?.modelName ?? "");
	const table = String(prismaError.meta?.table ?? "");
	const message =
		typeof prismaError.message === "string" ? prismaError.message : "";

	return (
		modelName === "SalesEmailAttempt" ||
		table.includes("SalesEmailAttempt") ||
		message.includes("SalesEmailAttempt")
	);
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
		skippedSales,
	};
}

async function recordSkippedSalesEmails(
	props: SendSalesEmailPayload,
	skippedSales: Awaited<ReturnType<typeof loadSales>>["skippedSales"],
) {
	if (!skippedSales.length) return;
	const { db } = await import("@gnd/db");

	try {
		await Promise.all(
			skippedSales.map((sale) =>
				db.salesEmailAttempt.create({
					data: {
						status: "SKIPPED",
						emailKind: "simple_sales_document_email",
						documentType: props.printType,
						emailType: props.emailType,
						subject:
							props.printType === "quote"
								? "GND quote email"
								: "GND invoice email",
						recipientEmail: sale.customerEmail || null,
						customerName: sale.customerName || null,
						customerEmail: sale.customerEmail || null,
						senderId: sale.salesRepId || null,
						salesRepId: sale.salesRepId || null,
						provider: "resend",
						providerStatus: "missing_recipient_metadata",
						errorCode: sale.reasons.join(","),
						errorMessage: `Skipped because ${sale.reasons.join(", ")}.`,
						salesIds: [sale.id],
						salesNos: [sale.orderId],
						salesIdsText: String(sale.id),
						salesNosText: sale.orderId,
						skippedAt: new Date(),
						metadata: {
							payload: {
								emailType: props.emailType,
								printType: props.printType,
								salesIds: [sale.id],
								skipPdfAttachment: true,
							},
							reasons: sale.reasons,
						},
					},
				}),
			),
		);
	} catch (error) {
		if (isMissingSalesEmailAttemptTableError(error)) {
			logger.warn(
				"Skipping skipped-sales email ledger writes because the SalesEmailAttempt table is missing.",
				{
					skippedCount: skippedSales.length,
				},
			);
			return;
		}
		throw error;
	}
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
			await recordSkippedSalesEmails(props, data.skippedSales);

			logger.info(`Received data: ${JSON.stringify(data)}`);
			if (!data) {
				throw new Error(`No data found ${JSON.stringify(props)}`);
			}

			const [{ Notifications }, { db }] = await Promise.all([
				import("@gnd/notifications"),
				import("@gnd/db"),
			]);
			const notifications = new Notifications(db);
			const emails = {
				sent: 0,
				skipped: data.skippedSales.length,
				failed: 0,
			};
			const emailAttemptIds: string[] = [];

			for (const matchingSales of data.mailables) {
				const salesIds = matchingSales.map((sale) => sale.id);
				const authorId = matchingSales[0]?.salesRepId;
				if (!authorId) {
					logger.warn("Skipping sales email group without author", {
						id,
						salesIds,
					});
					emails.skipped += matchingSales.length;
					continue;
				}
				logger.log("Routing sales email through notification system", {
					id,
					salesIds,
					printType: props.printType,
				});
				const result = await notifications.create(
					"simple_sales_document_email",
					{
						emailType: props.emailType,
						printType: props.printType,
						salesIds,
						skipPdfAttachment: true,
					},
					{
						includeChannelSubscribers: false,
						allowFallbackRecipient: false,
						author: {
							id: authorId,
							role: "employee",
						},
					},
				);
				emails.sent += result.emails.sent;
				emails.skipped += result.emails.skipped;
				emails.failed += result.emails.failed || 0;
				emailAttemptIds.push(...(result.emailAttemptIds || []));
			}

			return {
				type: id,
				emails,
				emailAttemptIds,
			};
		},
	});
}
