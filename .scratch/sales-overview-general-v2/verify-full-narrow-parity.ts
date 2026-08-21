#!/usr/bin/env bun

import { getSaleOverview } from "../../apps/api/src/db/queries/sales";
import { getSaleOverviewGeneralV2 } from "../../apps/api/src/db/queries/sales-overview-general-v2";
import { PrismaClient } from "../../packages/db/src/index";

const orderNos = process.argv.slice(2);
const orders = orderNos.length ? orderNos : ["09397LM", "09388PC"];
const db = new PrismaClient();

const generalV2Keys = [
	"id",
	"uuid",
	"slug",
	"orderId",
	"type",
	"accountNo",
	"displayName",
	"customerId",
	"customerPhone",
	"addressData",
	"isDealerSale",
	"isDyke",
	"salesDate",
	"orderStatus",
	"priority",
	"poNo",
	"salesRepId",
	"salesRep",
	"salesRepInitial",
	"deliveryOption",
	"paymentMethod",
	"paymentSummary",
	"costLines",
	"invoice",
	"specialOrder",
	"prodStatus",
	"inboundStatus",
	"stats",
	"status",
	"productionGateStatus",
	"productionGateLabel",
	"productionGateReason",
	"inventoryInboundOwnership",
	"documentReadiness",
] as const;

function selectGeneralV2Fields(value: Record<string, unknown>) {
	return Object.fromEntries(
		generalV2Keys.map((key) => [key, value[key] ?? null]),
	);
}

function serialize(value: unknown) {
	return JSON.stringify(value, (_key, item) => {
		if (item instanceof Date) return item.toISOString();
		return item;
	});
}

try {
	const results = [];
	for (const orderNo of orders) {
		const query = { orderNo, salesType: "order" as const };
		const [full, narrow] = await Promise.all([
			getSaleOverview({ db } as never, query),
			getSaleOverviewGeneralV2({ db } as never, query),
		]);
		if (!full || !narrow) {
			throw new Error(`Order ${orderNo} was not found by both loaders.`);
		}

		const fullFields = selectGeneralV2Fields(full as Record<string, unknown>);
		const narrowFields = selectGeneralV2Fields(
			narrow as Record<string, unknown>,
		);
		const mismatches = generalV2Keys.filter(
			(key) => serialize(fullFields[key]) !== serialize(narrowFields[key]),
		);
		results.push({ orderNo, checkedFields: generalV2Keys.length, mismatches });
	}

	console.log(JSON.stringify(results, null, 2));
	if (results.some((result) => result.mismatches.length > 0)) {
		process.exitCode = 1;
	}
} finally {
	await db.$disconnect();
}
