import type { TransactionClient } from "@gnd/db";
import type { channelNames } from "@gnd/utils/notification-channels";
import type { SalesCompletionMethod, SalesCompletionMilestone } from "./sales-completion";

/** Called only after a new completion record is created, in its transaction.
 * Writes the existing Activities feed without sending notifications or email.
 */
export async function recordSalesCompletionActivity(tx: TransactionClient, input: {
	recordId: string;
	salesOrderId: number;
	milestone: SalesCompletionMilestone;
	completionMethod: SalesCompletionMethod;
	recordedAt: Date;
	effectiveAt?: Date | null;
	actor: { id: number; name: string };
}) {
	const contact = await tx.notePadContacts.findFirst({
		where: { profileId: input.actor.id, role: "employee", deletedAt: null },
		select: { id: true },
	}) ?? await tx.notePadContacts.create({
		data: { profileId: input.actor.id, role: "employee", name: input.actor.name },
		select: { id: true },
	});
	const milestone = input.milestone === "PRODUCTION_COMPLETED" ? "Production" : "Fulfillment";
	const tags = {
		channel: "sales_info" satisfies (typeof channelNames)[number],
		source: "system",
		type: "activity",
		salesId: String(input.salesOrderId),
		completionRecordId: input.recordId,
		milestone: input.milestone,
		completionMethod: input.completionMethod,
		actorId: String(input.actor.id),
		authorName: input.actor.name,
		recordedAt: input.recordedAt.toISOString(),
		...(input.effectiveAt ? { effectiveAt: input.effectiveAt.toISOString() } : {}),
	};
	return tx.notePad.create({
		data: {
			senderContactId: contact.id,
			createdById: input.actor.id,
			createdAt: input.recordedAt,
			headline: `Marked as completed by ${input.actor.name}`,
			subject: `${milestone} completed`,
			note: input.completionMethod === "STATUS_ONLY"
				? `${milestone} completed — status only. No operational proof was created.`
				: `${milestone} completed — full workflow.`,
			tags: { createMany: { data: Object.entries(tags).map(([tagName, tagValue]) => ({ tagName, tagValue })) } },
		},
	});
}
