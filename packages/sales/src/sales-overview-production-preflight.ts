export type DoorProductionPreflightStatus =
	| "ready"
	| "review"
	| "blocked"
	| "not_applicable";

export type DoorProductionPreflightActionTab = "details" | "inventory";

export type DoorProductionPreflightCheck = {
	id:
		| "door_configuration"
		| "customer_pricing"
		| "supplier_variant"
		| "inventory"
		| "fulfillment"
		| "pdf";
	label: string;
	status: DoorProductionPreflightStatus;
	detail: string;
	actionTab?: DoorProductionPreflightActionTab;
};

type ConfigurationStep = {
	label?: string | null;
	value?: string | null;
};

type DoorConfiguration = {
	dimension?: string | null;
	swing?: string | null;
	noHandle?: boolean | null;
	lhQty?: number | null;
	rhQty?: number | null;
	totalQty?: number | null;
};

type OverviewItem = {
	title?: string | null;
	swing?: string | null;
	configurationSteps?: ConfigurationStep[] | null;
	doors?: DoorConfiguration[] | null;
};

type InventoryRow = {
	trackingPolicy?: SalesOverviewInventoryTrackingPolicy | null;
	qtyRequired?: number | null;
	inventoryVariantId?: number | null;
	cost?: number | null;
	salesPrice?: number | null;
	supplierCount?: number | null;
	hasSupplierPrice?: boolean | null;
	supplierNames?: string[] | null;
};

export type DoorProductionPreflightInput = {
	sale?: {
		overviewItems?: OverviewItem[] | null;
		customerProfile?: {
			id?: number | null;
			title?: string | null;
		} | null;
		taxSummary?: {
			configured?: boolean | null;
			codes?: string[] | null;
		} | null;
		deliveryOption?: DeliveryOption | null;
		shippingAddressConfigured?: boolean | null;
		documentReadiness?: {
			status?: SalesOverviewDocumentReadinessStatus | null;
		} | null;
	} | null;
	inventory?: {
		summary?: {
			readiness?: SalesInventoryOverviewReadiness | null;
		} | null;
		rows?: InventoryRow[] | null;
	} | null;
};

function normalizedText(value: unknown) {
	return typeof value === "string" ? value.trim() : "";
}

function isDoorItem(item: OverviewItem) {
	if (item.doors?.length) return true;
	const searchable = [
		item.title,
		...(item.configurationSteps || []).flatMap((step) => [
			step.label,
			step.value,
		]),
	]
		.map(normalizedText)
		.join(" ")
		.toLowerCase();
	return /\bdoor\b|\bpre-?hung\b|\bslab\b/.test(searchable);
}

function hasConfiguredStep(
	item: OverviewItem,
	labelPattern: RegExp,
	valuePattern?: RegExp,
) {
	return (item.configurationSteps || []).some((step) => {
		const label = normalizedText(step.label);
		const value = normalizedText(step.value);
		if (!labelPattern.test(label)) return false;
		return valuePattern ? valuePattern.test(value) : Boolean(value);
	});
}

function doorHasHanding(door: DoorConfiguration) {
	if (normalizedText(door.swing)) return true;
	if (door.noHandle) return true;
	const totalQty = Number(door.totalQty || 0);
	const handedQty = Number(door.lhQty || 0) + Number(door.rhQty || 0);
	return handedQty > 0 && (totalQty <= 0 || handedQty >= totalQty);
}

function buildDoorConfigurationCheck(
	items: OverviewItem[],
): DoorProductionPreflightCheck {
	const doorItems = items.filter(isDoorItem);
	if (!doorItems.length) {
		return {
			id: "door_configuration",
			label: "Door dimensions & handing",
			status: "not_applicable",
			detail: "No door configuration was detected on this order.",
		};
	}

	let configuredDoorCount = 0;
	let missingDimensionCount = 0;
	let missingHandingCount = 0;

	for (const item of doorItems) {
		const doors = item.doors || [];
		if (doors.length) {
			for (const door of doors) {
				configuredDoorCount += 1;
				if (!normalizedText(door.dimension)) missingDimensionCount += 1;
				if (!doorHasHanding(door)) missingHandingCount += 1;
			}
			continue;
		}

		configuredDoorCount += 1;
		const hasDimension = hasConfiguredStep(
			item,
			/(dimension|door size|width|height)/i,
		);
		const hasHanding =
			Boolean(normalizedText(item.swing)) ||
			hasConfiguredStep(item, /(swing|handing|hinge)/i) ||
			hasConfiguredStep(item, /handle/i, /(no|none|without)/i);
		if (!hasDimension) missingDimensionCount += 1;
		if (!hasHanding) missingHandingCount += 1;
	}

	if (missingDimensionCount || missingHandingCount) {
		const issues = [
			missingDimensionCount
				? `${missingDimensionCount} missing dimension`
				: null,
			missingHandingCount
				? `${missingHandingCount} missing swing, hinge, or no-handle choice`
				: null,
		].filter(Boolean);
		return {
			id: "door_configuration",
			label: "Door dimensions & handing",
			status: "blocked",
			detail: issues.join("; "),
			actionTab: "details",
		};
	}

	return {
		id: "door_configuration",
		label: "Door dimensions & handing",
		status: "ready",
		detail: `${configuredDoorCount} door configuration${configuredDoorCount === 1 ? "" : "s"} include dimensions and handing.`,
	};
}

function buildCustomerPricingCheck(
	sale: NonNullable<DoorProductionPreflightInput["sale"]>,
): DoorProductionPreflightCheck {
	const profile = normalizedText(sale.customerProfile?.title);
	const taxConfigured = Boolean(sale.taxSummary?.configured);
	if (!profile || !taxConfigured) {
		const missing = [
			profile ? null : "customer profile",
			taxConfigured ? null : "tax configuration",
		].filter(Boolean);
		return {
			id: "customer_pricing",
			label: "Customer profile & tax",
			status: "blocked",
			detail: `Missing ${missing.join(" and ")}.`,
			actionTab: "details",
		};
	}

	const taxCodes = (sale.taxSummary?.codes || []).filter(Boolean);
	return {
		id: "customer_pricing",
		label: "Customer profile & tax",
		status: "ready",
		detail: `${profile}; ${taxCodes.length ? taxCodes.join(", ") : "tax configured"}.`,
	};
}

function buildSupplierVariantCheck(
	inventory: DoorProductionPreflightInput["inventory"],
): DoorProductionPreflightCheck {
	const rows = (inventory?.rows || []).filter(
		(row) =>
			row.trackingPolicy === "tracked" && Number(row.qtyRequired || 0) > 0,
	);
	if (!rows.length) {
		return {
			id: "supplier_variant",
			label: "Supplier & variant pricing",
			status: "blocked",
			detail: "No required tracked inventory rows are available to verify.",
			actionTab: "inventory",
		};
	}

	const missingVariantOrPrice = rows.filter((row) => {
		const hasLinePrice =
			Number(row.cost || 0) > 0 || Number(row.salesPrice || 0) > 0;
		return !row.inventoryVariantId || !hasLinePrice;
	});
	if (missingVariantOrPrice.length) {
		return {
			id: "supplier_variant",
			label: "Supplier & variant pricing",
			status: "blocked",
			detail: `${missingVariantOrPrice.length} of ${rows.length} required components need a variant or price.`,
			actionTab: "inventory",
		};
	}

	const missingSupplier = rows.filter(
		(row) =>
			!row.hasSupplierPrice &&
			Number(row.supplierCount || 0) === 0 &&
			!(row.supplierNames || []).length,
	);
	if (missingSupplier.length) {
		return {
			id: "supplier_variant",
			label: "Supplier & variant pricing",
			status: "review",
			detail: `${missingSupplier.length} of ${rows.length} priced variants still need supplier confirmation.`,
			actionTab: "inventory",
		};
	}

	const missingSupplierPrice = rows.filter((row) => !row.hasSupplierPrice);
	if (missingSupplierPrice.length) {
		return {
			id: "supplier_variant",
			label: "Supplier & variant pricing",
			status: "blocked",
			detail: `${missingSupplierPrice.length} of ${rows.length} supplier variants need an active supplier price.`,
			actionTab: "inventory",
		};
	}

	return {
		id: "supplier_variant",
		label: "Supplier & variant pricing",
		status: "ready",
		detail: `${rows.length} required component${rows.length === 1 ? "" : "s"} have variant, supplier, and price evidence.`,
	};
}

function buildInventoryCheck(
	inventory: DoorProductionPreflightInput["inventory"],
): DoorProductionPreflightCheck {
	const readiness = inventory?.summary?.readiness;
	switch (readiness) {
		case "ready_for_production":
			return {
				id: "inventory",
				label: "Stock & inbound readiness",
				status: "ready",
				detail: "Required inventory is ready for production.",
			};
		case "fulfilled":
			return {
				id: "inventory",
				label: "Stock & inbound readiness",
				status: "ready",
				detail: "Required inventory is fulfilled.",
			};
		case "awaiting_inbound":
			return {
				id: "inventory",
				label: "Stock & inbound readiness",
				status: "review",
				detail: "Required inventory is still awaiting inbound receipt.",
				actionTab: "inventory",
			};
		case "allocation_review":
			return {
				id: "inventory",
				label: "Stock & inbound readiness",
				status: "review",
				detail: "Stock allocation review is still required.",
				actionTab: "inventory",
			};
		default:
			return {
				id: "inventory",
				label: "Stock & inbound readiness",
				status: "blocked",
				detail: "Inventory is not synced for a production readiness decision.",
				actionTab: "inventory",
			};
	}
}

function buildFulfillmentCheck(
	sale: NonNullable<DoorProductionPreflightInput["sale"]>,
): DoorProductionPreflightCheck {
	const option = sale.deliveryOption;
	if (option === "pickup") {
		return {
			id: "fulfillment",
			label: "Pickup / delivery",
			status: "ready",
			detail: "Customer pickup is selected.",
		};
	}
	if (option === "delivery" && sale.shippingAddressConfigured === true) {
		return {
			id: "fulfillment",
			label: "Pickup / delivery",
			status: "ready",
			detail: "Delivery is selected with a shipping address.",
		};
	}
	return {
		id: "fulfillment",
		label: "Pickup / delivery",
		status: "blocked",
		detail:
			option === "delivery"
				? "Delivery is selected but the shipping address is missing."
				: "Select pickup or delivery before production handoff.",
		actionTab: "details",
	};
}

function buildPdfCheck(
	sale: NonNullable<DoorProductionPreflightInput["sale"]>,
	items: OverviewItem[],
): DoorProductionPreflightCheck {
	if (!items.length) {
		return {
			id: "pdf",
			label: "Current sales PDF",
			status: "blocked",
			detail: "The order has no printable line items.",
			actionTab: "details",
		};
	}

	switch (sale.documentReadiness?.status) {
		case "ready":
			return {
				id: "pdf",
				label: "Current sales PDF",
				status: "ready",
				detail: "The current PDF snapshot is ready.",
			};
		case "on_demand":
		case undefined:
		case null:
			return {
				id: "pdf",
				label: "Current sales PDF",
				status: "ready",
				detail: "The saved order is ready for on-demand PDF generation.",
			};
		case "failed":
			return {
				id: "pdf",
				label: "Current sales PDF",
				status: "blocked",
				detail: "The current PDF generation failed and needs review.",
				actionTab: "details",
			};
		case "stale":
			return {
				id: "pdf",
				label: "Current sales PDF",
				status: "review",
				detail: "The saved PDF snapshot is stale and should be regenerated.",
				actionTab: "details",
			};
		case "generating":
			return {
				id: "pdf",
				label: "Current sales PDF",
				status: "review",
				detail: "The current PDF snapshot is still generating.",
				actionTab: "details",
			};
	}
}

export function deriveDoorProductionPreflight(
	input: DoorProductionPreflightInput,
) {
	const sale = input.sale || {};
	const items = sale.overviewItems || [];
	const checks: DoorProductionPreflightCheck[] = [
		buildDoorConfigurationCheck(items),
		buildCustomerPricingCheck(sale),
		buildSupplierVariantCheck(input.inventory),
		buildInventoryCheck(input.inventory),
		buildFulfillmentCheck(sale),
		buildPdfCheck(sale, items),
	];
	const counts = {
		ready: checks.filter((check) => check.status === "ready").length,
		review: checks.filter((check) => check.status === "review").length,
		blocked: checks.filter((check) => check.status === "blocked").length,
		notApplicable: checks.filter((check) => check.status === "not_applicable")
			.length,
	};
	const overallStatus: Exclude<
		DoorProductionPreflightStatus,
		"not_applicable"
	> = counts.blocked ? "blocked" : counts.review ? "review" : "ready";

	return {
		overallStatus,
		counts,
		checks,
	};
}
import type { DeliveryOption } from "@gnd/utils/sales";
import type { SalesOverviewDocumentReadinessStatus } from "./pdf-system";
import type {
	SalesInventoryOverviewReadiness,
	SalesOverviewInventoryTrackingPolicy,
} from "./sales-inventory-overview";
