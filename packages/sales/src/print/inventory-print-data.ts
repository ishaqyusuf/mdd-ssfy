import type { Db, Prisma } from "@gnd/db";
import {
	type FulfillmentLineLike,
	type SalesFulfillmentComponentProjection,
	type SalesFulfillmentLineProjection,
	summarizeSalesFulfillmentPlan,
} from "../sales-fulfillment-plan";
import { composeAddresses } from "./compose/addresses";
import { composeFooter } from "./compose/footer";
import { composeMeta } from "./compose/meta";
import { getModeConfig } from "./constants";
import { resolveDealerPrintBrandingFromSource } from "./dealer-branding";
import { parsePrintModes } from "./modes";
import { type PrintSalesData, buildPrintSalesInclude } from "./query";
import type { PrintSalesV2Input } from "./schema";
import type {
	CellHeader,
	LineItemRow,
	LineItemSection,
	PrintMode,
	PrintPage,
	PrintSection,
	RowCell,
} from "./types";
import { resolveSalesCompanyAddress } from "./get-print-document-data";

const excludeDeletedWhere = { deletedAt: null } as const;

type InventoryPrintSale = PrintSalesData & {
	lineItems: FulfillmentLineLike[];
};

function formatStatus(value?: string | null) {
	return String(value || "")
		.split("_")
		.filter(Boolean)
		.map((part) => part.charAt(0).toUpperCase() + part.slice(1))
		.join(" ");
}

function numberValue(value?: number | null) {
	return Math.round(Number(value || 0) * 1000) / 1000;
}

function componentName(component: SalesFulfillmentComponentProjection) {
	return (
		component.componentName ||
		component.inventoryName ||
		component.inventoryCategoryName ||
		component.inventoryVariantSku ||
		(component.id ? `Component ${component.id}` : "Unknown component")
	);
}

function lineTitle(line: SalesFulfillmentLineProjection) {
	return line.title || (line.id ? `Line item ${line.id}` : "Untitled line item");
}

function cell(
	value: string | number | null,
	colSpan: number,
	align: RowCell["align"] = "left",
	bold = false,
): RowCell {
	return {
		value,
		colSpan,
		align,
		bold,
	};
}

function inventoryProductionHeaders(): CellHeader[] {
	return [
		{ title: "#", key: null, colSpan: 1, align: "center" },
		{ title: "Line Item", key: "lineItem", colSpan: 4, align: "left" },
		{ title: "Component", key: "component", colSpan: 4, align: "left" },
		{ title: "SKU", key: "sku", colSpan: 2, align: "left" },
		{ title: "Req.", key: "required", colSpan: 1.2, align: "center" },
		{ title: "Alloc.", key: "allocated", colSpan: 1.2, align: "center" },
		{ title: "Inbound", key: "inbound", colSpan: 1.2, align: "center" },
		{ title: "Backorder", key: "backorder", colSpan: 1.4, align: "center" },
		{ title: "Status", key: "status", colSpan: 2, align: "center" },
	];
}

function inventoryPackingHeaders(): CellHeader[] {
	return [
		{ title: "#", key: null, colSpan: 1, align: "center" },
		{ title: "Line Item", key: "lineItem", colSpan: 6, align: "left" },
		{ title: "Ordered", key: "ordered", colSpan: 1.5, align: "center" },
		{ title: "Picked", key: "picked", colSpan: 1.5, align: "center" },
		{ title: "Shipped", key: "shipped", colSpan: 1.5, align: "center" },
		{ title: "Remaining", key: "remaining", colSpan: 1.5, align: "center" },
		{ title: "Backorder", key: "backorder", colSpan: 1.5, align: "center" },
		{ title: "Status", key: "status", colSpan: 2, align: "center" },
	];
}

function inventorySummaryHeaders(): CellHeader[] {
	return [
		{ title: "#", key: null, colSpan: 1, align: "center" },
		{ title: "Description", key: "description", colSpan: 6, align: "left" },
		{ title: "Qty", key: "qty", colSpan: 1.5, align: "center" },
		{ title: "Allocated", key: "allocated", colSpan: 1.5, align: "center" },
		{ title: "Remaining", key: "remaining", colSpan: 1.5, align: "center" },
		{ title: "Inventory Status", key: "status", colSpan: 3, align: "center" },
	];
}

function buildProductionRows(
	lines: SalesFulfillmentLineProjection[],
): LineItemRow[] {
	const rows: LineItemRow[] = [];

	for (const line of lines) {
		const components = line.components.length
			? line.components
			: [
					{
						id: null,
						componentName: null,
						inventoryName: null,
						inventoryCategoryName: null,
						inventoryVariantSku: null,
						orderedQty: line.orderedQty,
						allocatedQty: line.allocatedQty,
						inboundQty: line.inboundQty,
						backorderedQty: line.backorderedQty,
						status: line.status,
					} as SalesFulfillmentComponentProjection,
				];

		for (const component of components) {
			rows.push({
				cells: [
					cell(rows.length + 1, 1, "center", true),
					cell(lineTitle(line), 4, "left", true),
					cell(componentName(component), 4),
					cell(component.inventoryVariantSku || "", 2),
					cell(numberValue(component.orderedQty), 1.2, "center"),
					cell(numberValue(component.allocatedQty), 1.2, "center"),
					cell(numberValue(component.inboundQty), 1.2, "center"),
					cell(numberValue(component.backorderedQty), 1.4, "center", true),
					cell(formatStatus(component.status), 2, "center"),
				],
				componentDetails: [
					component.supplierName
						? { label: "Supplier", value: component.supplierName }
						: null,
					component.inventoryVariantDescription
						? {
								label: "Variant",
								value: component.inventoryVariantDescription,
							}
						: null,
				].filter(Boolean) as LineItemRow["componentDetails"],
			});
		}
	}

	return rows;
}

function buildPackingRows(lines: SalesFulfillmentLineProjection[]): LineItemRow[] {
	return lines.map((line, index) => ({
		cells: [
			cell(index + 1, 1, "center", true),
			cell(lineTitle(line), 6, "left", true),
			cell(numberValue(line.orderedQty), 1.5, "center"),
			cell(numberValue(line.pickedQty), 1.5, "center"),
			cell(numberValue(line.shippedQty), 1.5, "center"),
			cell(numberValue(line.remainingQty), 1.5, "center", true),
			cell(numberValue(line.backorderedQty), 1.5, "center", true),
			cell(formatStatus(line.status), 2, "center"),
		],
		componentDetails: line.components
			.filter(
				(component) =>
					component.backorderedQty > 0 ||
					component.inboundQty > component.receivedQty,
			)
			.map((component) => ({
				label: componentName(component),
				value: [
					component.backorderedQty > 0
						? `Backorder ${numberValue(component.backorderedQty)}`
						: null,
					component.inboundQty > 0
						? `Inbound ${numberValue(component.receivedQty)} / ${numberValue(
								component.inboundQty,
							)}`
						: null,
				]
					.filter(Boolean)
					.join(" | "),
			})),
	}));
}

function buildSummaryRows(lines: SalesFulfillmentLineProjection[]): LineItemRow[] {
	return lines.map((line, index) => ({
		cells: [
			cell(index + 1, 1, "center", true),
			cell(lineTitle(line), 6, "left", true),
			cell(numberValue(line.orderedQty), 1.5, "center"),
			cell(numberValue(line.allocatedQty), 1.5, "center"),
			cell(numberValue(line.remainingQty), 1.5, "center", true),
			cell(formatStatus(line.status), 3, "center"),
		],
	}));
}

export function buildInventoryPrintSections(
	lines: SalesFulfillmentLineProjection[],
	mode: PrintMode,
): PrintSection[] {
	const isProduction = mode === "production";
	const isPacking = mode === "packing-slip" || mode === "order-packing";
	const section: LineItemSection = {
		kind: "line-item",
		index: 0,
		title: isProduction
			? "Inventory Production BOM"
			: isPacking
				? "Inventory Packing List"
				: "Inventory Line Items",
		headers: isProduction
			? inventoryProductionHeaders()
			: isPacking
				? inventoryPackingHeaders()
				: inventorySummaryHeaders(),
		rows: isProduction
			? buildProductionRows(lines)
			: isPacking
				? buildPackingRows(lines)
				: buildSummaryRows(lines),
	};

	return [section];
}

export function buildInventoryPrintPage(
	sale: InventoryPrintSale,
	mode: PrintMode,
): PrintPage {
	const config = getModeConfig(mode);
	const fulfillment = summarizeSalesFulfillmentPlan(sale.lineItems || []);
	const { billing, shipping } = composeAddresses(sale, mode);
	const sections = buildInventoryPrintSections(fulfillment.lines, mode);

	return {
		meta: composeMeta(sale, mode),
		billing,
		shipping,
		sections,
		footer: config.showFooter ? composeFooter(sale, mode) : null,
		config,
		signing: null,
	};
}

export async function getInventoryPrintData(
	db: Db,
	input: PrintSalesV2Input,
): Promise<{ pages: PrintPage[]; title: string; firstOrderId: string | null }> {
	const findSales = db.salesOrders.findMany.bind(
		db.salesOrders,
	) as unknown as (args: {
		where: { id: { in: number[] } };
		include: Prisma.SalesOrdersInclude;
	}) => Promise<InventoryPrintSale[]>;

	const modes = parsePrintModes(input.mode);
	const sales = await findSales({
		where: { id: { in: input.ids } },
		include: {
			...buildPrintSalesInclude(modes),
			lineItems: {
				where: {
					deletedAt: null,
					lineItemType: "SALE",
				},
				orderBy: [{ sn: "asc" }, { id: "asc" }],
				select: {
					id: true,
					uid: true,
					title: true,
					qty: true,
					salesItem: {
						select: {
							id: true,
							description: true,
							qty: true,
							itemDeliveries: {
								where: excludeDeletedWhere,
								select: {
									id: true,
									qty: true,
									status: true,
									packingStatus: true,
									delivery: {
										select: {
											id: true,
											status: true,
											deliveredAt: true,
										},
									},
								},
							},
						},
					},
					components: {
						select: {
							id: true,
							required: true,
							qty: true,
							qtyAllocated: true,
							qtyInbound: true,
							qtyReceived: true,
							status: true,
							inventoryId: true,
							inventoryVariantId: true,
							inventoryCategoryId: true,
							subComponentId: true,
							inventory: {
								select: {
									id: true,
									name: true,
									productKind: true,
									defaultSupplier: {
										select: {
											id: true,
											name: true,
										},
									},
								},
							},
							inventoryVariant: {
								select: {
									id: true,
									sku: true,
									description: true,
								},
							},
							inventoryCategory: {
								select: {
									id: true,
									title: true,
									productKind: true,
								},
							},
							subComponent: {
								select: {
									id: true,
									inventoryCategory: {
										select: {
											id: true,
											title: true,
										},
									},
									defaultInventory: {
										select: {
											id: true,
											name: true,
										},
									},
								},
							},
							stockAllocations: {
								where: {
									deletedAt: null,
									status: {
										not: "cancelled",
									},
								},
								select: {
									qty: true,
									status: true,
								},
							},
							inboundDemands: {
								where: {
									deletedAt: null,
									status: {
										not: "cancelled",
									},
								},
								select: {
									qty: true,
									qtyReceived: true,
									status: true,
								},
							},
						},
					},
				},
			},
		},
	});

	const pages = sales.flatMap((sale) =>
		modes.map((mode) => buildInventoryPrintPage(sale, mode)),
	);
	const first = pages[0];
	const title =
		pages.length === 1 && first
			? `${first.meta.title} ${first.meta.salesNo}`
			: `Sales Inventory Print (${pages.length})`;

	return { pages, title, firstOrderId: sales[0]?.orderId ?? null };
}

async function resolveDealerPrintBranding(db: Db, salesOrderId: number) {
	const sale = await db.salesOrders.findUnique({
		where: {
			id: salesOrderId,
		},
		select: {
			dealerAuth: {
				select: {
					companyName: true,
					name: true,
					phoneNo: true,
					meta: true,
					primaryBillingAddress: {
						select: {
							address1: true,
							address2: true,
							city: true,
							state: true,
							country: true,
						},
					},
				},
			},
		},
	});

	return resolveDealerPrintBrandingFromSource(sale?.dealerAuth);
}

export async function getInventoryPrintDocumentData(
	db: Db,
	input: PrintSalesV2Input,
) {
	const { pages, title, firstOrderId } = await getInventoryPrintData(db, input);
	const dealerBranding = input.ids[0]
		? await resolveDealerPrintBranding(db, input.ids[0])
		: null;

	return {
		pages,
		title: title.replace(/[^\w\-]+/g, "_"),
		firstOrderId,
		companyAddress:
			dealerBranding?.companyAddress ||
			resolveSalesCompanyAddress(firstOrderId),
		logoUrl: dealerBranding?.logoUrl,
	};
}
