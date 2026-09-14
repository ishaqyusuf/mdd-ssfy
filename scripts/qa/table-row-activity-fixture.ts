/** Local-only, opt-in synthetic payment-review fixture. Dry-run is the default. */
const fixtureId = "QA-ROW-FEEDBACK-20260908";
const args = new Set(process.argv.slice(2));
for (const arg of args) {
	if (!["--apply", "--cleanup", "--reset"].includes(arg))
		throw new Error(`Unknown argument: ${arg}`);
}
const url = new URL(
	process.env.DATABASE_URL ?? "mysql://root@localhost:3307/gnd-prisma2",
);
if (
	!["localhost", "127.0.0.1"].includes(url.hostname) ||
	url.port !== "3307" ||
	url.pathname !== "/gnd-prisma2"
) {
	throw new Error(
		"This fixture requires the local gnd-prisma2 database on port 3307.",
	);
}
process.env.DATABASE_URL = url.toString();
const { db } = await import("../../packages/db/src/index.ts");
try {
	const existing = await db.salesOrders.findMany({
		where: { orderId: fixtureId, deletedAt: {} },
		select: { id: true, meta: true, deletedAt: true },
	});
	if (
		existing.some(
			(row) =>
				(row.meta as { validationFixtureId?: string } | null)
					?.validationFixtureId !== fixtureId,
		)
	)
		throw new Error("Fixture name collision; no changes made.");
	console.log({
		target: { host: url.hostname, port: url.port, database: url.pathname },
		apply: args.has("--apply"),
		action: args.has("--cleanup")
			? "Soft-delete only marked synthetic order and payment"
			: args.has("--reset")
				? "Reset only the marked synthetic fixture for another QA run"
				: "Create one synthetic order and zero-amount reviewable payment",
		fixtureId,
		existing,
	});
	if (args.has("--apply")) {
		if (args.has("--cleanup")) {
			await db.$transaction(async (tx) => {
				const orderIds = existing.map((row) => row.id);
				await tx.salesPayments.updateMany({
					where: {
						orderId: { in: orderIds },
						meta: { path: "$.validationFixtureId", equals: fixtureId },
					},
					data: { deletedAt: new Date() },
				});
				await tx.salesOrders.updateMany({
					where: { id: { in: orderIds } },
					data: { deletedAt: new Date() },
				});
			});
		} else if (args.has("--reset") && existing.length) {
			await db.$transaction(async (tx) => {
				const orderIds = existing.map((row) => row.id);
				await tx.salesOrders.updateMany({
					where: { id: { in: orderIds }, deletedAt: {} },
					data: { deletedAt: null },
				});
				await tx.salesPayments.updateMany({
					where: {
						orderId: { in: orderIds },
						deletedAt: {},
						meta: { path: "$.validationFixtureId", equals: fixtureId },
					},
					data: {
						deletedAt: null,
						reviewStatus: "needs_review",
						reviewedAt: null,
						reviewedById: null,
						reviewMethod: null,
						origin: "office",
					},
				});
				for (const orderId of orderIds) {
					const payment = await tx.salesPayments.findFirst({
						where: {
							orderId,
							deletedAt: {},
							meta: { path: "$.validationFixtureId", equals: fixtureId },
						},
						select: { id: true },
					});
					if (!payment)
						await tx.salesPayments.create({
							data: {
								orderId,
								amount: 0,
								status: "success",
								reviewStatus: "needs_review",
								origin: "office",
								meta: { validationFixtureId: fixtureId },
							},
						});
				}
			});
		} else if (!existing.length) {
			const created = await db.salesOrders.create({
				data: {
					orderId: fixtureId,
					slug: fixtureId.toLowerCase(),
					title: "Synthetic row feedback QA",
					type: "order",
					status: "paid",
					subTotal: 0,
					grandTotal: 0,
					amountDue: 0,
					meta: { validationFixtureId: fixtureId },
					payments: {
						create: {
							amount: 0,
							status: "success",
							reviewStatus: "needs_review",
							origin: "office",
							meta: { validationFixtureId: fixtureId },
						},
					},
				},
				select: { id: true, orderId: true },
			});
			console.log({ created });
		}
	}
} finally {
	await db.$disconnect();
}
