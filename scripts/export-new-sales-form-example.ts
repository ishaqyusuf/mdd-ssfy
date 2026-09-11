import { db } from "@gnd/db";
import superjson from "superjson";
import { getNewSalesForm } from "../apps/api/src/db/queries/new-sales-form";
import {
	getNewSalesFormAdjustmentStatus,
	getNewSalesFormCommitmentSnapshot,
} from "../apps/api/src/db/queries/new-sales-form-adjustments";

const target = new URL(process.env.DATABASE_URL || "");
if (!["localhost", "127.0.0.1", "::1", "[::1]"].includes(target.hostname)) {
	throw new Error("This example exporter requires the local database");
}
const slug = process.argv
	.slice(2)
	.find((value) => value.startsWith("--slug="))
	?.slice(7);
if (!slug) throw new Error("Choose an existing local order with --slug=<slug>");

try {
	// Read-only local inspection. Do not select dealer orders: their normal loading
	// path requires an authenticated office-access context, which this CLI lacks.
	const selected = await db.salesOrders.findFirst({
		where: { slug, type: "order", deletedAt: null },
		select: { id: true, dealerAuthId: true },
	});
	if (!selected || selected.dealerAuthId)
		throw new Error("Choose an existing non-dealer local order");
	const form = await getNewSalesForm({ db }, { type: "order", slug });
	const salesId = form.salesId;
	if (!salesId) throw new Error("The selected order has no sales ID");
	// These are the exact read-only enrichments performed by newSalesForm.get.
	const [changeProtection, activeAdjustment] = await Promise.all([
		getNewSalesFormCommitmentSnapshot(db, salesId),
		getNewSalesFormAdjustmentStatus(db, salesId),
	]);
	const payload = { ...form, changeProtection, activeAdjustment };
	console.log("SALES_FORM_EXAMPLE_BEGIN");
	console.log(
		JSON.stringify(
			{ payload, transport: superjson.serialize(payload) },
			null,
			2,
		),
	);
	console.log("SALES_FORM_EXAMPLE_END");
} finally {
	await db.$disconnect();
}
