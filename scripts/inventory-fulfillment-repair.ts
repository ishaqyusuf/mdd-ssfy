#!/usr/bin/env bun

const DEFAULT_DATABASE_URL = "mysql://root@localhost:3307/gnd-prisma2";
const TERMINAL_SALES_STATUSES = ["fulfilled", "completed", "cancelled"];
const INVALID_ORDER_INVENTORY_STATUSES = ["backordered", "partially_fulfilled"];
const DELIVERY_MODE_REPAIRS: Record<string, "pickup" | "delivery" | "ship"> = {
	shipping: "ship",
	shipped: "ship",
	local_delivery: "delivery",
	deliver: "delivery",
	will_call: "pickup",
	pick_up: "pickup",
};

type Options = {
	apply: boolean;
	confirmReview: boolean;
	json: boolean;
	salesOrderIds: number[] | null;
};

class UsageError extends Error {}

function usage() {
	console.log(
		[
			"Usage:",
			"  bun run inventory:fulfillment-repair",
			"  bun run inventory:fulfillment-repair --json",
			"  bun run inventory:fulfillment-repair --sales-order-ids <csv>",
			"  bun run inventory:fulfillment-repair --apply --confirm-review --sales-order-ids <csv>",
			"",
			"The command is dry-run by default. Apply mode is intentionally bounded to explicitly reviewed sales order ids.",
		].join("\n"),
	);
}

function parseIds(value: string | undefined) {
	if (!value) throw new UsageError("--sales-order-ids requires a value.");
	const ids = value
		.split(",")
		.map((part) => Number(part.trim()))
		.filter((id) => Number.isInteger(id) && id > 0);
	if (ids.length === 0) {
		throw new UsageError("--sales-order-ids requires positive integer ids.");
	}
	return [...new Set(ids)].sort((a, b) => a - b);
}

export function parseArgs(argv: string[]): Options {
	const options: Options = {
		apply: false,
		confirmReview: false,
		json: false,
		salesOrderIds: null,
	};
	for (let index = 0; index < argv.length; index += 1) {
		const arg = argv[index];
		if (arg === "--help" || arg === "-h") {
			usage();
			process.exit(0);
		}
		if (arg === "--apply") options.apply = true;
		else if (arg === "--confirm-review") options.confirmReview = true;
		else if (arg === "--json") options.json = true;
		else if (arg === "--sales-order-ids") {
			options.salesOrderIds = parseIds(argv[index + 1]);
			index += 1;
		} else if (arg.startsWith("--sales-order-ids=")) {
			options.salesOrderIds = parseIds(arg.slice("--sales-order-ids=".length));
		} else throw new UsageError(`Unknown argument: ${arg}`);
	}
	if (
		options.apply &&
		(!options.confirmReview || !options.salesOrderIds?.length)
	) {
		throw new UsageError(
			"--apply requires --confirm-review and --sales-order-ids.",
		);
	}
	return options;
}

async function main() {
	const options = parseArgs(process.argv.slice(2));
	process.env.DATABASE_URL ||= DEFAULT_DATABASE_URL;
	const { db } = await import("../packages/db/src/index.ts");
	const idFilter = options.salesOrderIds?.length
		? { id: { in: options.salesOrderIds } }
		: {};
	try {
		const orders = await db.salesOrders.findMany({
			where: {
				...idFilter,
				deletedAt: null,
				OR: [
					{ inventoryStatus: { in: INVALID_ORDER_INVENTORY_STATUSES } },
					{
						deliveryOption: {
							notIn: ["pickup", "delivery", "ship"],
							not: null,
						},
					},
					{
						OR: [
							{ status: { in: TERMINAL_SALES_STATUSES } },
							{ prodStatus: { in: TERMINAL_SALES_STATUSES } },
						],
					},
				],
			},
			orderBy: { id: "asc" },
			take: options.salesOrderIds?.length ?? 500,
			select: {
				id: true,
				orderId: true,
				status: true,
				prodStatus: true,
				inventoryStatus: true,
				deliveryOption: true,
				lineItems: {
					where: { deletedAt: null, lineItemType: "SALE" },
					select: {
						components: {
							where: { status: { not: "cancelled" } },
							select: { id: true },
						},
					},
				},
			},
		});

		const repairs = orders
			.map((order) => {
				const deliveryKey = order.deliveryOption?.trim().toLowerCase() ?? null;
				const lifecycle =
					`${order.status ?? ""} ${order.prodStatus ?? ""}`.toLowerCase();
				return {
					salesOrderId: order.id,
					orderId: order.orderId,
					clearOrderInventoryStatus: INVALID_ORDER_INVENTORY_STATUSES.includes(
						order.inventoryStatus?.toLowerCase() ?? "",
					),
					deliveryModeFrom: order.deliveryOption,
					deliveryModeTo: deliveryKey
						? DELIVERY_MODE_REPAIRS[deliveryKey]
						: null,
					needsDeliveryReview: Boolean(
						deliveryKey &&
							deliveryKey !== "pickup" &&
							deliveryKey !== "delivery" &&
							deliveryKey !== "ship",
					),
					cancelComponentIds: TERMINAL_SALES_STATUSES.some((status) =>
						lifecycle.includes(status),
					)
						? order.lineItems.flatMap((line) =>
								line.components.map((component) => component.id),
							)
						: [],
				};
			})
			.filter(
				(repair) =>
					repair.clearOrderInventoryStatus ||
					repair.needsDeliveryReview ||
					repair.cancelComponentIds.length > 0,
			);

		if (options.apply) {
			await db.$transaction(async (tx) => {
				for (const repair of repairs) {
					if (repair.clearOrderInventoryStatus || repair.deliveryModeTo) {
						await tx.salesOrders.update({
							where: { id: repair.salesOrderId },
							data: {
								...(repair.clearOrderInventoryStatus
									? { inventoryStatus: null }
									: {}),
								...(repair.deliveryModeTo
									? { deliveryOption: repair.deliveryModeTo }
									: {}),
							},
						});
					}
					if (repair.cancelComponentIds.length) {
						await tx.lineItemComponents.updateMany({
							where: {
								id: { in: repair.cancelComponentIds },
								status: { not: "cancelled" },
							},
							data: { status: "cancelled" },
						});
					}
				}
			});
		}

		const payload = {
			mode: options.apply ? "apply" : "dry-run",
			bounded: Boolean(options.salesOrderIds?.length),
			candidateCount: repairs.length,
			repairs,
		};
		console.log(
			options.json
				? JSON.stringify(payload, null, 2)
				: [
						`Inventory fulfillment repair (${payload.mode})`,
						`Candidates: ${payload.candidateCount}`,
						...repairs.map(
							(repair) =>
								`- ${repair.orderId} (#${repair.salesOrderId}): clear status=${repair.clearOrderInventoryStatus}, delivery=${repair.deliveryModeFrom ?? "-"}->${repair.deliveryModeTo ?? "manual review"}, cancel components=${repair.cancelComponentIds.length}`,
						),
					].join("\n"),
		);
	} finally {
		await db.$disconnect();
	}
}

if (import.meta.main) {
	main().catch((error) => {
		console.error(error instanceof Error ? error.message : error);
		process.exit(1);
	});
}
