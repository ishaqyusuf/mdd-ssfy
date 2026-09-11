import { expect, test } from "bun:test";
import { projectFulfillmentQuantities } from "./fulfillment-quantities";
import {
	compareFulfillmentOrders,
	countFulfillmentOrderSections,
	matchesFulfillmentOrder,
	projectFulfillmentOrderWorkspace,
} from "./fulfillment-order-workspace";
const clock = {
	now: new Date("2026-09-10T12:00:00Z"),
	timeZone: "America/New_York",
};
const quantities = projectFulfillmentQuantities({
	lines: [
		{
			uid: "item",
			salesItemId: 1,
			size: null,
			ordered: { qty: 10, lh: 0, rh: 0 },
		},
	],
	deliveries: [
		{
			id: 1,
			state: "active",
			planned: [{ uid: "item", quantity: { qty: 1, lh: 0, rh: 0 } }],
			packed: [],
			delivered: [],
		},
	],
});
const child = (id: number, driverId: number | null, dueDate: string) => ({
	id,
	driverId,
	driverName: driverId ? `Driver ${driverId}` : null,
	dueDate: new Date(dueDate),
	status: "queue",
	meta: {},
	deliveryMode: "delivery",
	itemCount: 0,
	stockAllocationCount: 0,
	hasOpenException: false,
});
const row = projectFulfillmentOrderWorkspace(
	{
		id: 1,
		quantities,
		completed: false,
		fulfillments: [
			child(1, 10, "2026-09-10T12:00:00Z"),
			child(2, 20, "2026-09-11T12:00:00Z"),
		],
	},
	clock,
);

test("fulfillment quantities separate the plan from packing and require completion evidence", () => {
	const completed = {
		...child(8, 10, "2026-09-10"),
		status: "completed",
		itemCount: 1,
		plannedQty: 5,
		packedQty: 3,
	};
	const overview = projectFulfillmentOrderWorkspace(
		{
			id: 8,
			quantities,
			completed: false,
			fulfillments: [
				completed,
				{
					...completed,
					id: 9,
					meta: { dispatchCompletion: { status: "completed" } },
				},
			],
		},
		clock,
	);
	expect(overview.fulfillments[0]).toMatchObject({
		plannedQty: 5,
		packedQty: 3,
		deliveredQty: 0,
	});
	expect(overview.fulfillments[1]).toMatchObject({
		plannedQty: 5,
		packedQty: 3,
		deliveredQty: 3,
	});
});
test("multiple fulfillments remain one order in every count", () => {
	expect(row.activeCount).toBe(2);
	expect(countFulfillmentOrderSections([row])).toEqual({
		all: 1,
		active: 1,
		backlog: 1,
		completed: 0,
		dueToday: 1,
		pastDue: 0,
	});
});
test("driver aggregation shows both active drivers", () => {
	expect(row.drivers.map((driver) => driver.id)).toEqual([10, 20]);
	expect(matchesFulfillmentOrder(row, { driversId: [10] })).toBe(true);
	expect(row.drivers).toHaveLength(2);
});
test("driver and date filters must match the same fulfillment", () => {
	expect(
		matchesFulfillmentOrder(row, { driversId: [20], dueBuckets: ["today"] }),
	).toBe(false);
	expect(
		matchesFulfillmentOrder(row, { driversId: [10], dueBuckets: ["today"] }),
	).toBe(true);
});
test("canonical completed order excludes stale open children from Active", () => {
	const completed = projectFulfillmentOrderWorkspace(
		{
			id: 2,
			quantities,
			completed: true,
			fulfillments: [child(3, 10, "2026-09-10T12:00:00Z")],
		},
		clock,
	);
	expect(completed.drivers).toEqual([]);
	expect(matchesFulfillmentOrder(completed, { section: "active" })).toBe(false);
	expect(matchesFulfillmentOrder(completed, { section: "completed" })).toBe(
		true,
	);
});
test("unassigned pickup order is not backlog and remains discoverable in All", () => {
	const pickup = projectFulfillmentOrderWorkspace(
		{
			id: 3,
			deliveryMode: "pickup",
			quantities,
			completed: false,
			fulfillments: [],
		},
		clock,
	);
	expect(
		matchesFulfillmentOrder(pickup, {
			section: "backlog",
			deliveryModes: ["pickup"],
			stages: ["ready_to_assign"],
		}),
	).toBe(false);
	expect(matchesFulfillmentOrder(pickup, { section: "active" })).toBe(false);
	expect(
		matchesFulfillmentOrder(pickup, {
			section: "dispatches",
			deliveryModes: ["pickup"],
		}),
	).toBe(true);
});

test("schedule range and driver must match the same fulfillment, including boundaries", () => {
	const scheduleRange = ["2026-09-10T12:00:00Z", "2026-09-10T12:00:00Z"];
	expect(matchesFulfillmentOrder(row, { driversId: [10], scheduleRange })).toBe(
		true,
	);
	expect(matchesFulfillmentOrder(row, { driversId: [20], scheduleRange })).toBe(
		false,
	);
	const unscheduled = projectFulfillmentOrderWorkspace(
		{ id: 3, quantities, completed: false, fulfillments: [] },
		clock,
	);
	expect(matchesFulfillmentOrder(unscheduled, { scheduleRange })).toBe(false);
});

test("section counts ignore the selected tab while preserving other filters", () => {
	const completed = projectFulfillmentOrderWorkspace(
		{ id: 2, quantities, completed: true, fulfillments: [] },
		clock,
	);
	const routeFilter = { section: "completed", scheduleRange: null };
	expect(countFulfillmentOrderSections([row, completed], routeFilter)).toEqual({
		all: 2,
		active: 1,
		backlog: 1,
		completed: 1,
		dueToday: 1,
		pastDue: 0,
	});
});

test("pagination sort is stable and leaves unscheduled orders last in both directions", () => {
	const order = (id: number, due: string | null) => ({
		id,
		orderNo: String(id),
		customerName: "Customer",
		createdAt: clock.now,
		workspace: { nextDueDate: due ? new Date(due) : null },
	});
	const orders = [
		order(3, null),
		order(2, "2026-09-10"),
		order(1, "2026-09-10"),
		order(4, "2026-09-11"),
	];
	expect(
		[...orders]
			.sort((a, b) => compareFulfillmentOrders(a, b, ["dueDate.asc"]))
			.map((item) => item.id),
	).toEqual([1, 2, 4, 3]);
	expect(
		[...orders]
			.sort((a, b) => compareFulfillmentOrders(a, b, ["dueDate.desc"]))
			.map((item) => item.id),
	).toEqual([4, 1, 2, 3]);
	expect(
		[...orders]
			.sort((a, b) =>
				compareFulfillmentOrders(a, b, ["dueDate.asc", "orderId.desc"]),
			)
			.map((item) => item.id),
	).toEqual([2, 1, 4, 3]);
});

test("risk filters use the business day and cover orders without fulfillments", () => {
	const today = projectFulfillmentOrderWorkspace(
		{
			id: 4,
			quantities,
			completed: false,
			fulfillments: [child(4, 10, "2026-09-10T08:00:00Z")],
		},
		clock,
	);
	expect(matchesFulfillmentOrder(today, { risks: ["overdue"] })).toBe(false);
	const unassigned = projectFulfillmentOrderWorkspace(
		{
			id: 5,
			deliveryMode: "delivery",
			quantities,
			completed: false,
			fulfillments: [],
		},
		clock,
	);
	expect(matchesFulfillmentOrder(unassigned, { risks: ["unassigned"] })).toBe(
		true,
	);
	expect(matchesFulfillmentOrder(unassigned, { risks: ["unscheduled"] })).toBe(
		true,
	);
	const completed = projectFulfillmentOrderWorkspace(
		{ id: 6, quantities, completed: true, fulfillments: [] },
		clock,
	);
	expect(
		matchesFulfillmentOrder(completed, { stages: ["ready_to_assign"] }),
	).toBe(false);
	expect(matchesFulfillmentOrder(completed, { stages: ["fulfilled"] })).toBe(
		true,
	);
});
