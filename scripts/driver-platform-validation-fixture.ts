#!/usr/bin/env bun

const DEFAULT_DATABASE_URL = "mysql://root@localhost:3307/gnd-prisma2";
const SALE_ORDER_ID = "INV-FIX-ALLOC";
const FIXTURE_ID = "DRIVER-PLATFORM-INV-FIX";

type Options = {
	apply: boolean;
	rollback: boolean;
	driverId: number | null;
};

class UsageError extends Error {}

function usage() {
	console.log(
		[
			"Usage:",
			"  bun scripts/driver-platform-validation-fixture.ts --driver-id <id>",
			"  bun scripts/driver-platform-validation-fixture.ts --driver-id <id> --apply",
			"  bun scripts/driver-platform-validation-fixture.ts --rollback",
			"  bun scripts/driver-platform-validation-fixture.ts --rollback --apply",
			"",
			"The fixture is local-only and defaults to dry-run. Seed INV-FIX-ALLOC first.",
		].join("\n"),
	);
}

function parseArgs(argv: string[]): Options {
	const options: Options = { apply: false, rollback: false, driverId: null };
	for (let index = 0; index < argv.length; index += 1) {
		const arg = argv[index];
		if (arg === "--help" || arg === "-h") {
			usage();
			process.exit(0);
		}
		if (arg === "--apply") {
			options.apply = true;
			continue;
		}
		if (arg === "--rollback") {
			options.rollback = true;
			continue;
		}
		if (arg === "--driver-id") {
			const value = Number(argv[index + 1]);
			if (!Number.isInteger(value) || value <= 0) {
				throw new UsageError("--driver-id must be a positive integer");
			}
			options.driverId = value;
			index += 1;
			continue;
		}
		throw new UsageError(`Unknown argument: ${arg}`);
	}
	if (!options.rollback && !options.driverId) {
		throw new UsageError("--driver-id is required when preparing the fixture");
	}
	return options;
}

function assertLocalDatabase(databaseUrl: string) {
	const parsed = new URL(databaseUrl);
	if (!["localhost", "127.0.0.1", "::1"].includes(parsed.hostname)) {
		throw new Error(
			"DRIVER_PLATFORM_FIXTURE_LOCAL_ONLY: use a localhost database target.",
		);
	}
}

function asRecord(value: unknown): Record<string, unknown> {
	return value && typeof value === "object" && !Array.isArray(value)
		? (value as Record<string, unknown>)
		: {};
}

async function findFixtureDispatch(
	db: typeof import("../packages/db/src/index.ts").db,
	salesOrderId: number,
) {
	const deliveries = await db.orderDelivery.findMany({
		where: { salesOrderId, deletedAt: null },
		orderBy: { id: "desc" },
		select: { id: true, status: true, driverId: true, meta: true },
	});
	return (
		deliveries.find(
			(delivery) => asRecord(delivery.meta).validationFixtureId === FIXTURE_ID,
		) || null
	);
}

async function prepare(
	db: typeof import("../packages/db/src/index.ts").db,
	options: Options,
) {
	const sale = await db.salesOrders.findFirst({
		where: { orderId: SALE_ORDER_ID, type: "order", deletedAt: null },
		select: { id: true },
	});
	if (!sale) {
		throw new Error(
			"INV-FIX-ALLOC is missing. Run `bun run inventory:seed-allocation-fixture --apply` first.",
		);
	}
	const driver = await db.users.findFirst({
		where: { id: options.driverId!, deletedAt: null, accessRevokedAt: null },
		select: { id: true, name: true, email: true },
	});
	if (!driver)
		throw new Error("The requested active driver account was not found.");
	const existing = await findFixtureDispatch(db, sale.id);
	const line = await db.lineItem.findFirst({
		where: {
			saleId: sale.id,
			lineItemType: "SALE",
			deletedAt: null,
			components: { some: { required: true, status: { not: "cancelled" } } },
		},
		select: {
			id: true,
			components: {
				where: { required: true, status: { not: "cancelled" } },
				select: {
					id: true,
					stockAllocations: {
						where: {
							deletedAt: null,
							orderDeliveryId: null,
							status: { in: ["approved", "reserved"] },
						},
						select: { id: true, qty: true, status: true, notes: true },
						orderBy: { id: "asc" },
					},
				},
			},
		},
	});
	const availableQty =
		line?.components.reduce(
			(total, component) =>
				total +
				component.stockAllocations.reduce(
					(sum, allocation) => sum + Number(allocation.qty || 0),
					0,
				),
			0,
		) || 0;
	if (availableQty < 3) {
		throw new Error(
			`INV-FIX-ALLOC needs at least 3 approved/reserved unbound units; found ${availableQty}. Re-apply its seed before continuing.`,
		);
	}
	if (
		existing &&
		["in progress", "completed", "delivered"].includes(existing.status || "")
	) {
		throw new Error(
			"The fixture has already entered the driver flow. Roll it back before preparing another run.",
		);
	}

	const allocationSnapshot =
		line?.components.flatMap((component) =>
			component.stockAllocations.map((allocation) => ({
				id: allocation.id,
				status: allocation.status,
				notes: allocation.notes,
				qty: Number(allocation.qty || 0),
			})),
		) || [];
	const plan = {
		action: existing ? "repair" : "create",
		salesOrderId: sale.id,
		driver,
		availableQty,
		dispatchId: existing?.id || null,
	};
	if (!options.apply) return plan;

	if (existing) {
		await db.orderDelivery.update({
			where: { id: existing.id },
			data: { driverId: driver.id, status: "queue", deliveredAt: null },
		});
		return { ...plan, dispatchId: existing.id };
	}
	const delivery = await db.orderDelivery.create({
		data: {
			salesOrderId: sale.id,
			deliveryMode: "delivery",
			driverId: driver.id,
			createdById: driver.id,
			status: "queue",
			dueDate: new Date(Date.now() + 24 * 60 * 60 * 1000),
			meta: {
				validationFixture: true,
				validationFixtureId: FIXTURE_ID,
				allocationSnapshot,
			},
		},
		select: { id: true },
	});
	return { ...plan, dispatchId: delivery.id };
}

async function rollback(
	db: typeof import("../packages/db/src/index.ts").db,
	options: Options,
) {
	const sale = await db.salesOrders.findFirst({
		where: { orderId: SALE_ORDER_ID, type: "order" },
		select: { id: true },
	});
	if (!sale) return { action: "missing", dispatchId: null };
	const delivery = await findFixtureDispatch(db, sale.id);
	if (!delivery) return { action: "missing", dispatchId: null };
	const snapshot = Array.isArray(asRecord(delivery.meta).allocationSnapshot)
		? (asRecord(delivery.meta).allocationSnapshot as Array<{
				id: number;
				status: "approved" | "reserved";
				notes: string | null;
				qty: number;
			}>)
		: [];
	const plan = {
		action: "rollback",
		dispatchId: delivery.id,
		restoreAllocationIds: snapshot.map((allocation) => allocation.id),
	};
	if (!options.apply) return plan;

	await db.$transaction(async (tx) => {
		await tx.orderItemDelivery.updateMany({
			where: { orderDeliveryId: delivery.id, deletedAt: null },
			data: { deletedAt: new Date(), packingStatus: "unpacked" },
		});
		for (const allocation of snapshot) {
			await tx.stockAllocation.updateMany({
				where: { id: allocation.id },
				data: {
					orderDeliveryId: null,
					status: allocation.status,
					notes: allocation.notes,
					qty: allocation.qty,
					deletedAt: null,
				},
			});
		}
		await tx.stockAllocation.updateMany({
			where: {
				orderDeliveryId: delivery.id,
				id: { notIn: snapshot.map((allocation) => allocation.id) },
			},
			data: { deletedAt: new Date(), status: "released" },
		});
		await tx.orderDelivery.update({
			where: { id: delivery.id },
			data: { deletedAt: new Date(), status: "cancelled", deliveredAt: null },
		});
	});
	return plan;
}

async function main() {
	const options = parseArgs(process.argv.slice(2));
	process.env.DATABASE_URL ||= DEFAULT_DATABASE_URL;
	assertLocalDatabase(process.env.DATABASE_URL);
	const { db } = await import("../packages/db/src/index.ts");
	try {
		await db.$queryRawUnsafe("SELECT 1");
		const result = options.rollback
			? await rollback(db, options)
			: await prepare(db, options);
		console.log(
			JSON.stringify(
				{
					fixtureId: FIXTURE_ID,
					mode: options.apply ? "apply" : "dry-run",
					...result,
				},
				null,
				2,
			),
		);
	} finally {
		await db.$disconnect();
	}
}

main().catch((error) => {
	console.error(
		`[driver-platform-validation-fixture] ${
			error instanceof Error ? error.message : String(error)
		}`,
	);
	if (error instanceof UsageError) usage();
	process.exit(1);
});
