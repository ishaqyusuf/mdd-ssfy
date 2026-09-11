import { expect, test } from "bun:test";
import {
	createFulfillmentAssignmentSchema,
	updateFulfillmentAssignmentSchema,
	fulfillmentAssignmentFingerprint,
	fulfillmentAssignmentRevision,
} from "./fulfillment-assignment-command";
import { projectFulfillmentQuantities } from "./fulfillment-quantities";
const input = {
	requestId: "b8c98ba5-37ae-4dcb-b89f-e23f2c28a704",
	salesId: 1,
	expectedRevision: "a".repeat(64),
	driverId: null,
	dueDate: null,
	deliveryMode: "delivery" as const,
	selectionMode: "all_remaining" as const,
	lines: [],
};
test("edit commands retain assignment constraints and reject invalid identity or extra fields", () => {
	const edit = { ...input, fulfillmentId: 2 };
	expect(updateFulfillmentAssignmentSchema.parse(edit)).toEqual(edit);
	for (const invalid of [
		{ ...edit, fulfillmentId: 0 },
		{ ...edit, fulfillmentId: 1.5 },
		{ ...edit, fulfillmentId: undefined },
		{ ...edit, selectionMode: "selected", lines: [] },
		{ ...edit, deliveryMode: "pickup", driverId: 1 },
		{ ...edit, dueDate: "2026-02-30" },
		{ ...edit, status: "completed" },
	])
		expect(updateFulfillmentAssignmentSchema.safeParse(invalid).success).toBe(
			false,
		);
});
test("missing schedule remains explicit; impossible dates and pickup drivers fail", () => {
	expect(createFulfillmentAssignmentSchema.parse(input).dueDate).toBeNull();
	expect(
		createFulfillmentAssignmentSchema.safeParse({
			...input,
			dueDate: "2026-02-30",
		}).success,
	).toBe(false);
	expect(
		createFulfillmentAssignmentSchema.safeParse({
			...input,
			deliveryMode: "pickup",
			driverId: 1,
		}).success,
	).toBe(false);
});
test("fingerprint detects changed command and ignores request identity", () => {
	const hash = fulfillmentAssignmentFingerprint(input);
	expect(fulfillmentAssignmentFingerprint({ ...input, driverId: 2 })).not.toBe(
		hash,
	);
	expect(
		fulfillmentAssignmentFingerprint({ ...input, requestId: "new-request" }),
	).toBe(hash);
});
test("revision is stable across object-key ordering and detects equal-quantity header edits", () => {
	const projection = projectFulfillmentQuantities({
		lines: [],
		deliveries: [],
	});
	const first = {
		salesId: 1,
		projection,
		fulfillments: [
			{ id: 1, status: "queue", meta: { revision: 1, mode: "selected" } },
		],
	};
	const revision = fulfillmentAssignmentRevision(first);
	expect(
		fulfillmentAssignmentRevision({
			...first,
			fulfillments: [
				{ id: 1, status: "queue", meta: { mode: "selected", revision: 1 } },
			],
		}),
	).toBe(revision);
	expect(
		fulfillmentAssignmentRevision({
			...first,
			fulfillments: [
				{ id: 1, status: "queue", meta: { revision: 2, mode: "selected" } },
			],
		}),
	).not.toBe(revision);
});

test("revision changes when packing changes without changing assigned totals", () => {
	const projection = projectFulfillmentQuantities({
		lines: [{ uid: "a", salesItemId: 1, size: null, ordered: { qty: 10, lh: 0, rh: 0 } }],
		deliveries: [{ id: 1, state: "active", planned: [{ uid: "a", quantity: { qty: 5, lh: 0, rh: 0 } }], packed: [{ uid: "a", quantity: { qty: 2, lh: 0, rh: 0 } }], delivered: [] }],
	});
	const changed = { ...projection, lines: projection.lines.map(line => ({ ...line, packed: { qty: 3, lh: 0, rh: 0 } })) };
	const input = { salesId: 1, projection, fulfillments: [{ id: 1, status: "packed", meta: {} }] };
	expect(changed.lines[0]?.assigned).toEqual(projection.lines[0]?.assigned);
	expect(fulfillmentAssignmentRevision({ ...input, projection: changed })).not.toBe(fulfillmentAssignmentRevision(input));
});

test("revision detects redistribution between fulfillments with unchanged order totals", () => {
	const projection = projectFulfillmentQuantities({ lines: [], deliveries: [] });
	const fulfillments = [
		{ id: 1, status: "packing", meta: {}, items: [{ id: 10, qty: 2, packingStatus: "packed" }] },
		{ id: 2, status: "packing", meta: {}, items: [{ id: 20, qty: 3, packingStatus: "packed" }] },
	];
	const original = fulfillmentAssignmentRevision({ salesId: 1, projection, fulfillments });
	const redistributed = fulfillments.map((fulfillment) => ({
		...fulfillment,
		items: fulfillment.items.map((item) => ({ ...item, qty: fulfillment.id === 1 ? 3 : 2 })),
	}));
	expect(fulfillmentAssignmentRevision({ salesId: 1, projection, fulfillments: redistributed })).not.toBe(original);
	expect(fulfillmentAssignmentRevision({ salesId: 1, projection, fulfillments: [...fulfillments].reverse() })).toBe(original);
});
