import type { Db, Prisma } from "@gnd/db";
import { type SalesSetting, getSalesSetting } from "../exports";
import {
	getDispatchCompletedActivity,
	getDispatchCompletetionNotes,
} from "../sales-control/actions";
import { composeAddresses } from "./compose/addresses";
import { composeDoorSections } from "./compose/door-sections";
import { composeFooter } from "./compose/footer";
import { composeLineItemSections } from "./compose/line-item-sections";
import { composeMeta } from "./compose/meta";
import { composeMouldingSections } from "./compose/moulding-sections";
import { composeServiceSections } from "./compose/service-sections";
import { composeShelfSections } from "./compose/shelf-sections";
import { getModeConfig } from "./constants";
import { type PrintSalesData, buildPrintSalesInclude } from "./query";
import type { PrintSalesV2Input } from "./schema";
import type {
	PrintMode,
	PrintPage,
	PrintSection,
	PrintSigningData,
} from "./types";

/**
 * Main entry point: DB → typed PrintPage[] payloads.
 * Templates never touch the database — they receive these payloads only.
 */
export async function getPrintData(
	db: Db,
	input: PrintSalesV2Input,
): Promise<{ pages: PrintPage[]; title: string; firstOrderId: string | null }> {
	const findPrintSales = db.salesOrders.findMany.bind(
		db.salesOrders,
	) as unknown as (args: {
		where: { id: { in: number[] } };
		include: Prisma.SalesOrdersInclude;
	}) => Promise<PrintSalesData[]>;

	const [sales, setting] = await Promise.all([
		findPrintSales({
			where: { id: { in: input.ids } },
			include: buildPrintSalesInclude(input.mode),
		}),
		getSalesSetting(db),
	]);

	// order-packing generates both invoice + packing-slip per sale
	const jobs: { sale: PrintSalesData; mode: PrintMode }[] = sales.flatMap(
		(s) => {
			if (input.mode === "order-packing") {
				return [
					{ sale: s, mode: "invoice" as PrintMode },
					{ sale: s, mode: "packing-slip" as PrintMode },
				];
			}
			return [{ sale: s, mode: input.mode }];
		},
	);

	const pages = await Promise.all(
		jobs.map(({ sale, mode }) =>
			composePage(db, sale, mode, setting, input.dispatchId),
		),
	);

	const first = pages[0];
	const title =
		pages.length === 1 && first
			? `${first.meta.title} ${first.meta.salesNo}`
			: `Sales Print (${pages.length})`;

	return { pages, title, firstOrderId: sales[0]?.orderId ?? null };
}

async function composePage(
	db: Db,
	sale: PrintSalesData,
	mode: PrintMode,
	setting: SalesSetting | null,
	dispatchId?: number | null,
): Promise<PrintPage> {
	const config = getModeConfig(mode);
	const meta = composeMeta(sale, mode);
	const { billing, shipping } = composeAddresses(sale, mode);

	// Compose all section types
	const doors = composeDoorSections(sale, config, setting, dispatchId);
	const mouldings = composeMouldingSections(sale, config, dispatchId);
	const services = composeServiceSections(sale, config, dispatchId);
	const shelves = composeShelfSections(sale, config);
	const lineItems = composeLineItemSections(sale, config, dispatchId);

	// Merge and sort all sections by their lineIndex
	const sections: PrintSection[] = [
		...doors,
		...mouldings,
		...services,
		...shelves,
		...lineItems,
	].sort((a, b) => a.index - b.index);

	const footer = config.showFooter ? composeFooter(sale, mode) : null;
	const signing = await composeSigningData(db, sale, mode, dispatchId);

	return {
		meta,
		billing,
		shipping,
		sections,
		footer,
		config,
		signing,
	};
}

async function composeSigningData(
	db: Db,
	sale: PrintSalesData,
	mode: PrintMode,
	dispatchId?: number | null,
): Promise<PrintSigningData | null> {
	if (mode !== "packing-slip" || !dispatchId) {
		return null;
	}

	const completionActivity =
		await getDispatchCompletedActivity(db, dispatchId);
	const completionNote =
		completionActivity || (await getDispatchCompletetionNotes(db, dispatchId));
	const customerName =
		sale.shippingAddress?.name ||
		sale.customer?.businessName ||
		sale.customer?.name ||
		null;

	return {
		dispatchId,
		customerName,
		packedBy: completionNote?.tag?.packedBy?.value || null,
		receivedBy:
			completionNote?.tag?.receivedBy?.value ||
			completionNote?.tag?.dispatchRecipient?.value ||
			customerName,
		signatureUrl: completionNote?.tag?.signature?.value || null,
		signedAt: completionNote?.createdAt
			? new Date(completionNote.createdAt).toISOString()
			: null,
	};
}
