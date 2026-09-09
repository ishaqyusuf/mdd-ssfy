import { z } from "zod";
import { PRODUCTION_BUSINESS_TIME_ZONE } from "./production-date";

export function availabilityBusinessDate(now = new Date()) {
	const parts = new Intl.DateTimeFormat("en-CA", {
		timeZone: PRODUCTION_BUSINESS_TIME_ZONE,
		year: "numeric",
		month: "2-digit",
		day: "2-digit",
	}).formatToParts(now);
	return ["year", "month", "day"]
		.map((type) => parts.find((part) => part.type === type)!.value)
		.join("-");
}
const calendarDate = z
	.string()
	.regex(/^\d{4}-\d{2}-\d{2}$/)
	.refine((value) => {
		const date = new Date(`${value}T12:00:00Z`);
		return (
			Number.isFinite(date.getTime()) &&
			date.toISOString().slice(0, 10) === value
		);
	}, "Choose a valid received date.");
const selectionSchema = z.discriminatedUnion("mode", [
	z.object({ mode: z.literal("all") }),
	z.object({
		mode: z.literal("selected"),
		items: z
			.array(
				z.object({
					id: z.string().min(1),
					qty: z.number().finite().positive(),
				}),
			)
			.min(1),
	}),
]);
export const productionAvailabilitySaveSchema = z.object({
	salesOrderId: z.number().int().positive(),
	expectedRevision: z.string().regex(/^[a-f0-9]{64}$/),
	idempotencyKey: z.string().uuid(),
	supplierId: z.number().int().positive().nullable(),
	receivedDate: calendarDate,
	selection: selectionSchema,
	note: z.string().trim().max(2000).optional(),
});

// A calendar-only receipt is stored at business noon, independent of the viewer's
// timezone. Audit createdAt remains the actual operation timestamp.
export function receivedDateToTimestamp(value: string, now = new Date()) {
	calendarDate.parse(value);
	if (value > availabilityBusinessDate(now))
		throw new Error("Received date cannot be in the future.");
	const noonUtc = new Date(`${value}T12:00:00Z`);
	const localHour = Number(
		new Intl.DateTimeFormat("en-US", {
			timeZone: PRODUCTION_BUSINESS_TIME_ZONE,
			hour: "2-digit",
			hourCycle: "h23",
		}).format(noonUtc),
	);
	return new Date(noonUtc.getTime() + (12 - localHour) * 60 * 60 * 1000);
}

export function resolveAvailabilitySelections(
	needs: {
		id: string;
		componentQuantities: { id: number; qtyAvailableToMark: number }[];
		qtyAvailableToMark: number;
	}[],
	selection: z.infer<typeof selectionSchema>,
) {
	const items =
		selection.mode === "all"
			? needs
					.filter((need) => need.qtyAvailableToMark > 0)
					.map((need) => ({ id: need.id, qty: need.qtyAvailableToMark }))
			: selection.items;
	if (!items.length)
		throw new Error("No remaining materials can be marked available.");
	if (new Set(items.map((item) => item.id)).size !== items.length)
		throw new Error("Select each material only once.");
	return items.flatMap((item) => {
		const need = needs.find((need) => need.id === item.id);
		if (
			!need ||
			!Number.isFinite(item.qty) ||
			item.qty <= 0 ||
			item.qty > need.qtyAvailableToMark + 0.000001
		)
			throw new Error(
				"Material quantities or access changed. Refresh and try again.",
			);
		let remaining = item.qty;
		const selections = need.componentQuantities.flatMap((component) => {
			const qty = Math.min(remaining, component.qtyAvailableToMark);
			remaining -= qty;
			return qty > 0 ? [{ lineItemComponentIds: [component.id], qty }] : [];
		});
		if (remaining > 0.000001)
			throw new Error("Material quantities changed. Refresh and try again.");
		return selections;
	});
}
