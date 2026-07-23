import type { Db } from "@gnd/db";
import { buildShortUrl, findOrCreateShortLinkForTarget } from "@gnd/db/queries";

export const salesDocumentDeliveryChannels = [
	"email",
	"whatsapp",
	"sms",
] as const;

export type SalesDocumentDeliveryChannel =
	(typeof salesDocumentDeliveryChannels)[number];

export type SalesDocumentMessageLinks = {
	pdfLink?: string | null;
	paymentLink?: string | null;
	acceptQuoteLink?: string | null;
};

const MAX_CHANNEL_MESSAGE_LENGTH = 1_500;

type ShortenLinksInput = SalesDocumentMessageLinks & {
	type: "order" | "quote";
	salesIds: number[];
	salesNos: string[];
	createdById?: number | null;
	expiresAt: Date;
	acceptQuoteExpiresAt?: Date | null;
};

function compactSourceId(input: ShortenLinksInput, kind: string) {
	const identity = input.salesIds.length
		? input.salesIds
				.slice()
				.sort((a, b) => a - b)
				.join("-")
		: input.salesNos.slice().sort().join("-");
	return `${input.type}:${identity}:${kind}`;
}

async function shorten(
	db: Db,
	input: ShortenLinksInput,
	kind: "pdf" | "payment" | "accept-quote",
	targetUrl?: string | null,
) {
	if (!targetUrl) return null;
	const expiresAt =
		kind === "accept-quote"
			? input.acceptQuoteExpiresAt || input.expiresAt
			: input.expiresAt;
	const link = await findOrCreateShortLinkForTarget(db, {
		targetUrl,
		sourceType: "sales_document_message",
		sourceId: compactSourceId(input, kind),
		title: `${input.type === "quote" ? "Quote" : "Invoice"} ${kind} link`,
		expiresAt,
		createdById: input.createdById ?? null,
		meta: {
			documentType: input.type,
			linkKind: kind,
			salesIds: input.salesIds,
			salesNos: input.salesNos,
		},
	});
	return buildShortUrl(link.slug);
}

export async function shortenSalesDocumentMessageLinks(
	db: Db,
	input: ShortenLinksInput,
): Promise<SalesDocumentMessageLinks> {
	const [pdfLink, paymentLink, acceptQuoteLink] = await Promise.all([
		shorten(db, input, "pdf", input.pdfLink),
		shorten(db, input, "payment", input.paymentLink),
		shorten(db, input, "accept-quote", input.acceptQuoteLink),
	]);
	return {
		pdfLink,
		paymentLink,
		acceptQuoteLink,
	};
}

export function buildSalesDocumentChannelMessage(input: {
	type: "order" | "quote";
	customerName?: string | null;
	salesNos: string[];
	message?: string | null;
	links: SalesDocumentMessageLinks;
}) {
	const documentLabel = input.type === "quote" ? "quote" : "invoice";
	const salesLabel = input.salesNos.filter(Boolean).join(", ");
	const greeting = input.customerName?.trim()
		? `Hello ${input.customerName.trim()},`
		: "Hello,";
	const defaultMessage = `GND Millwork sent your ${documentLabel}${salesLabel ? ` ${salesLabel}` : ""}.`;
	const trailingLines = [
		input.links.acceptQuoteLink
			? `Review and accept: ${input.links.acceptQuoteLink}`
			: null,
		input.links.pdfLink ? `View document: ${input.links.pdfLink}` : null,
		input.links.paymentLink
			? `Make a payment: ${input.links.paymentLink}`
			: null,
		"Questions? Reply to your GND sales representative.",
	].filter((line): line is string => Boolean(line));
	const fixedLength = [greeting, ...trailingLines].join("\n").length + 1;
	const messageBudget = Math.max(
		0,
		MAX_CHANNEL_MESSAGE_LENGTH - fixedLength - 1,
	);
	const requestedMessage = input.message?.trim() || defaultMessage;
	const customerMessage =
		requestedMessage.length <= messageBudget
			? requestedMessage
			: `${requestedMessage.slice(0, Math.max(0, messageBudget - 1)).trimEnd()}…`;
	return [greeting, customerMessage, ...trailingLines]
		.filter(Boolean)
		.join("\n");
}
