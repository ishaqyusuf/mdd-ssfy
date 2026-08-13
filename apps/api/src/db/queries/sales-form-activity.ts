import type { TRPCContext } from "@api/trpc/init";
import { TRPCError } from "@trpc/server";

type SalesActivityLine = {
	id?: number | null;
	uid: string;
	title?: string | null;
	description?: string | null;
	qty: number;
};

type SalesActivityCopy = {
	subject: string;
	headline: string;
	note: string;
	activityType: string;
};

type SalesActivityDb = TRPCContext["db"];

function money(value: number) {
	return `$${Number(value || 0).toFixed(2)}`;
}

function lineKey(line: Pick<SalesActivityLine, "id" | "uid">) {
	return line.id ? `id:${line.id}` : `uid:${line.uid}`;
}

function lineTitle(line: Partial<SalesActivityLine>) {
	return String(line.title || line.description || "Line item").trim();
}

function quantityChangeLines(
	beforeLines: SalesActivityLine[],
	afterLines: SalesActivityLine[],
) {
	const beforeByKey = new Map(
		beforeLines.map((line) => [lineKey(line), line] as const),
	);
	const afterByKey = new Map(
		afterLines.map((line) => [lineKey(line), line] as const),
	);
	const keys = new Set([...beforeByKey.keys(), ...afterByKey.keys()]);
	const changes = Array.from(keys).flatMap((key) => {
		const before = beforeByKey.get(key);
		const after = afterByKey.get(key);
		const beforeQty = Number(before?.qty || 0);
		const afterQty = Number(after?.qty || 0);
		return beforeQty === afterQty
			? []
			: [`${lineTitle(after || before || {})}: ${beforeQty} → ${afterQty}`];
	});
	if (changes.length <= 8) return changes;
	return [...changes.slice(0, 8), `+${changes.length - 8} more line changes`];
}

export function buildSalesFormUpdateActivity(input: {
	salesType: "order" | "quote";
	orderId: string;
	status: string;
	autosave: boolean;
	beforeGrandTotal: number;
	afterGrandTotal: number;
	beforeLines: SalesActivityLine[];
	afterLines: SalesActivityLine[];
}): SalesActivityCopy {
	const document = input.salesType === "quote" ? "Quote" : "Sale";
	const action = input.autosave ? "autosaved" : "updated";
	const details = [`Status: ${input.status}.`];
	const quantityChanges = quantityChangeLines(
		input.beforeLines,
		input.afterLines,
	);
	if (quantityChanges.length) {
		details.push("Quantity changes:", ...quantityChanges);
	}
	if (Number(input.beforeGrandTotal) !== Number(input.afterGrandTotal)) {
		details.push(
			`Order total: ${money(input.beforeGrandTotal)} → ${money(input.afterGrandTotal)}`,
		);
	}
	if (details.length === 1) {
		details.push("Customer, dates, pricing, or other sale details were saved.");
	}
	return {
		subject: `${document} ${action}`,
		headline: `${document} ${input.orderId} was ${action} in the sales form.`,
		note: details.join("\n"),
		activityType: input.autosave
			? "sales_form_autosaved"
			: "sales_form_updated",
	};
}

export function buildSalesFormAdjustmentActivity(input: {
	orderId: string;
	direction: "INCREASE" | "REDUCTION" | "MIXED" | string;
	beforeGrandTotal: number;
	afterGrandTotal: number;
	lines: Array<{
		title: string;
		beforeQty: number;
		afterQty: number;
	}>;
}): SalesActivityCopy {
	const reductions = input.lines.filter(
		(line) => Number(line.afterQty) < Number(line.beforeQty),
	);
	const isReduction = reductions.length > 0 || input.direction === "REDUCTION";
	const changedLines = (isReduction ? reductions : input.lines).map(
		(line) =>
			`${line.title || "Line item"}: ${Number(line.beforeQty)} → ${Number(line.afterQty)}`,
	);
	const visibleChanges =
		changedLines.length <= 8
			? changedLines
			: [
					...changedLines.slice(0, 8),
					`+${changedLines.length - 8} more line changes`,
				];
	return {
		subject: isReduction
			? "Quantity reduction review"
			: "Quantity change review",
		headline: isReduction
			? `Quantity reduction was found on sale ${input.orderId} and recorded for review.`
			: `Quantity changes were found on sale ${input.orderId} and recorded for review.`,
		note: [
			isReduction ? "Reduced quantities:" : "Quantity changes:",
			...visibleChanges,
			`Order total: ${money(input.beforeGrandTotal)} → ${money(input.afterGrandTotal)}`,
		].join("\n"),
		activityType: isReduction
			? "sales_quantity_reduction_review"
			: "sales_quantity_change_review",
	};
}

export function buildInboundDemandAdjustmentActivity(input: {
	orderId: string;
	inboundId: number;
	lineTitle: string;
	previousQty: number;
	targetQty: number;
	receivedQty: number;
}): SalesActivityCopy {
	const removed = input.targetQty === 0;
	return {
		subject: removed ? "Item removed from inbound" : "Inbound quantity reduced",
		headline: removed
			? `${input.lineTitle} was removed from inbound #${input.inboundId} for sale ${input.orderId}.`
			: `${input.lineTitle} was reduced on inbound #${input.inboundId} for sale ${input.orderId}.`,
		note: [
			`Inbound quantity: ${input.previousQty} → ${input.targetQty}`,
			`Already received: ${input.receivedQty}`,
			removed
				? "The sales demand remains open and may be assigned to another inbound."
				: "Only this sale's linked inbound demand was changed.",
		].join("\n"),
		activityType: removed
			? "sales_inbound_item_removed"
			: "sales_inbound_quantity_reduced",
	};
}

export function buildSpecialOrderEnrollmentActivity(input: {
	orderId: string;
	reason: string;
}): SalesActivityCopy {
	return {
		subject: "Special Order enabled",
		headline: `Sale ${input.orderId} was manually classified as a Special Order.`,
		note: `Reason: ${input.reason.trim()}`,
		activityType: "special_order_enabled",
	};
}

export function buildSpecialOrderRevisionInvalidatedActivity(input: {
	orderId: string;
	hadCustomerEvidence: boolean;
}): SalesActivityCopy {
	return {
		subject: input.hadCustomerEvidence
			? "Special Order reapproval required"
			: "Special Order approval revision updated",
		headline: input.hadCustomerEvidence
			? `Customer-visible changes on sale ${input.orderId} superseded the prior approval evidence.`
			: `Customer-visible changes on sale ${input.orderId} created a new approval revision.`,
		note: input.hadCustomerEvidence
			? "The customer must review and sign the current order revision again. No email was sent automatically."
			: "Any prior approval link was revoked. No email was sent automatically.",
		activityType: "special_order_revision_invalidated",
	};
}

export async function getSalesActivitySenderContactId(
	db: SalesActivityDb,
	userId: number,
) {
	const existing = await db.notePadContacts.findFirst({
		where: { profileId: userId, role: "employee", deletedAt: null },
		select: { id: true },
	});
	if (existing?.id) return existing.id;
	const user = await db.users.findFirst({
		where: { id: userId, deletedAt: null },
		select: { id: true, name: true },
	});
	if (!user) {
		throw new TRPCError({
			code: "INTERNAL_SERVER_ERROR",
			message: "Unable to resolve the sales activity author.",
		});
	}
	const created = await db.notePadContacts.create({
		data: {
			profileId: user.id,
			role: "employee",
			name: user.name,
		},
		select: { id: true },
	});
	return created.id;
}

export async function createSalesFormTimelineActivity(
	db: SalesActivityDb,
	input: {
		salesId: number;
		orderId: string;
		senderContactId: number;
		copy: SalesActivityCopy;
	},
) {
	return db.notePad.create({
		data: {
			subject: input.copy.subject,
			headline: input.copy.headline,
			note: input.copy.note,
			senderContactId: input.senderContactId,
			tags: {
				createMany: {
					data: [
						{ tagName: "channel", tagValue: "Sales" },
						{ tagName: "salesId", tagValue: String(input.salesId) },
						{ tagName: "salesNo", tagValue: input.orderId },
						{ tagName: "type", tagValue: "system" },
						{ tagName: "status", tagValue: "public" },
						{
							tagName: "activity",
							tagValue: input.copy.activityType,
						},
					],
				},
			},
		},
		select: { id: true },
	});
}
