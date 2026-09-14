/** Local-only fixture for recording a synthetic $1 cash payment; dry-run by default. */
const fixtureId = "QA-ROW-PAYMENT-20260914";
const args = new Set(process.argv.slice(2));
for (const arg of args)
	if (!["--apply", "--cleanup"].includes(arg))
		throw new Error(`Unknown argument: ${arg}`);
const url = new URL(
	process.env.DATABASE_URL ?? "mysql://root@127.0.0.1:3307/gnd-prisma2",
);
if (
	!["localhost", "127.0.0.1"].includes(url.hostname) ||
	url.port !== "3307" ||
	url.pathname !== "/gnd-prisma2"
)
	throw new Error("This fixture requires local gnd-prisma2 on port 3307.");
process.env.DATABASE_URL = url.toString();
const { db } = await import("../../packages/db/src/index.ts");
try {
	const order = await db.salesOrders.findFirst({
		where: { orderId: fixtureId, deletedAt: {} },
		select: { id: true, meta: true },
	});
	const customer = await db.customers.findFirst({
		where: { phoneNo: fixtureId, deletedAt: {} },
		select: { id: true, meta: true },
	});
	const wallet = await db.customerWallet.findFirst({
		where: { accountNo: fixtureId, deletedAt: {} },
		select: { id: true, meta: true },
	});
	for (const row of [order, customer, wallet])
		if (
			row &&
			(row.meta as { validationFixtureId?: string } | null)
				?.validationFixtureId !== fixtureId
		)
			throw new Error("Fixture collision; no changes made.");
	console.log({
		fixtureId,
		target: `${url.hostname}:${url.port}${url.pathname}`,
		apply: args.has("--apply"),
		cleanup: args.has("--cleanup"),
		existing: {
			orderId: order?.id,
			customerId: customer?.id,
			walletId: wallet?.id,
		},
		syntheticAmount: 1,
		noCustomerContactDetails: true,
	});
	if (args.has("--apply")) {
		if (args.has("--cleanup")) {
			await db.$transaction(async (tx) => {
				const deletedAt = new Date();
				if (order) {
					await tx.salesPayments.updateMany({
						where: { orderId: order.id },
						data: { deletedAt },
					});
					await tx.salesOrderListProjection.updateMany({
						where: { salesOrderId: order.id },
						data: { salesDeletedAt: deletedAt },
					});
					await tx.salesOrders.updateMany({
						where: { id: order.id, deletedAt: {} },
						data: { deletedAt },
					});
				}
				if (wallet) {
					await tx.customerTransaction.updateMany({
						where: { walletId: wallet.id },
						data: { deletedAt },
					});
					await tx.customerWallet.updateMany({
						where: { id: wallet.id, deletedAt: {} },
						data: { deletedAt },
					});
				}
				if (customer)
					await tx.customers.updateMany({
						where: { id: customer.id, deletedAt: {} },
						data: { deletedAt },
					});
			});
		} else {
			if (order || customer || wallet)
				throw new Error(
					"Fixture already exists; do not overwrite payment history.",
				);
			await db.$transaction(async (tx) => {
				const meta = { validationFixtureId: fixtureId };
				const wallet = await tx.customerWallet.create({
					data: { accountNo: fixtureId, balance: 0, meta },
					select: { id: true },
				});
				const customer = await tx.customers.create({
					data: {
						phoneNo: fixtureId,
						name: "Synthetic row payment QA",
						walletId: wallet.id,
						meta,
					},
					select: { id: true },
				});
				const order = await tx.salesOrders.create({
					data: {
						orderId: fixtureId,
						slug: fixtureId.toLowerCase(),
						type: "order",
						status: "Active",
						title: "Synthetic $1 cash recording QA",
						customerId: customer.id,
						subTotal: 1,
						grandTotal: 1,
						amountDue: 1,
						meta,
					},
					select: { id: true },
				});
				console.log({ createdOrderId: order.id });
			});
		}
	}
} finally {
	await db.$disconnect();
}
