import { expect, test } from "bun:test";
import {
	productionAvailabilitySaveSchema,
	receivedDateToTimestamp,
	resolveAvailabilitySelections,
} from "./production-availability-contract";
const request = {
	salesOrderId: 1,
	expectedRevision: "a".repeat(64),
	idempotencyKey: "40c03435-1820-4b1c-8e44-07d19af2bb08",
	supplierId: null,
	receivedDate: "2026-09-09",
	selection: { mode: "all" },
};
test("availability request accepts N/A and requires a received calendar date", () => {
	expect(productionAvailabilitySaveSchema.safeParse(request).success).toBe(
		true,
	);
	expect(
		productionAvailabilitySaveSchema.safeParse({
			...request,
			receivedDate: "2026-02-30",
		}).success,
	).toBe(false);
});
test("received date uses New York business time while retaining the chosen calendar day", () => {
	expect(
		receivedDateToTimestamp(
			"2026-09-08",
			new Date("2026-09-09T12:00:00Z"),
		).toISOString(),
	).toBe("2026-09-08T16:00:00.000Z");
	expect(
		receivedDateToTimestamp(
			"2026-01-08",
			new Date("2026-09-09T12:00:00Z"),
		).toISOString(),
	).toBe("2026-01-08T17:00:00.000Z");
	expect(() =>
		receivedDateToTimestamp("2026-09-09", new Date("2026-09-09T01:00:00Z")),
	).toThrow("future");
});
test("mark all uses every eligible row while a partial selection retains exact quantities", () => {
	const needs = [
		{
			id: "a",
			componentQuantities: [{ id: 1, qtyAvailableToMark: 20 }],
			qtyAvailableToMark: 20,
		},
		{
			id: "b",
			componentQuantities: [{ id: 2, qtyAvailableToMark: 16 }],
			qtyAvailableToMark: 16,
		},
		{
			id: "c",
			componentQuantities: [{ id: 3, qtyAvailableToMark: 0 }],
			qtyAvailableToMark: 0,
		},
	];
	expect(resolveAvailabilitySelections(needs, { mode: "all" })).toEqual([
		{ lineItemComponentIds: [1], qty: 20 },
		{ lineItemComponentIds: [2], qty: 16 },
	]);
	expect(
		resolveAvailabilitySelections(needs, {
			mode: "selected",
			items: [{ id: "a", qty: 3 }],
		}),
	).toEqual([{ lineItemComponentIds: [1], qty: 3 }]);
	expect(() =>
		resolveAvailabilitySelections(needs, {
			mode: "selected",
			items: [{ id: "a", qty: 21 }],
		}),
	).toThrow("changed");
	expect(() =>
		resolveAvailabilitySelections(needs, {
			mode: "selected",
			items: [{ id: "other", qty: 1 }],
		}),
	).toThrow("changed");
	expect(() =>
		resolveAvailabilitySelections(needs, {
			mode: "selected",
			items: [
				{ id: "a", qty: 3 },
				{ id: "a", qty: 3 },
			],
		}),
	).toThrow("once");
});

test("merged selections respect each component's receipt capacity", () => {
	expect(
		resolveAvailabilitySelections(
			[
				{
					id: "merged",
					qtyAvailableToMark: 11,
					componentQuantities: [
						{ id: 1, qtyAvailableToMark: 1 },
						{ id: 2, qtyAvailableToMark: 10 },
					],
				},
			],
			{ mode: "all" },
		),
	).toEqual([
		{ lineItemComponentIds: [1], qty: 1 },
		{ lineItemComponentIds: [2], qty: 10 },
	]);
});
