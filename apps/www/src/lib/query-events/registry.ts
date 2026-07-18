import { pathTarget, queryTarget } from "./types";
import type {
	MutationRoute,
	QueryEventScope,
	QueryTarget,
	SalesQueryRef,
} from "./types";

type QueryEventDefinition = {
	includeSalesOverview?: boolean;
	targets: readonly QueryTarget[];
};

const pageTabTargets = [
	pathTarget("pageTabs.list"),
	pathTarget("pageTabs.defaults"),
] as const;

const salesDashboardTargets = [
	pathTarget("salesDashboard.getKpis"),
	pathTarget("salesDashboard.getRecentSales"),
	pathTarget("salesDashboard.getRevenueOverTime"),
	pathTarget("salesDashboard.getTopProducts"),
	pathTarget("salesDashboard.getSalesRepLeaderboard"),
	pathTarget("sales.mobileDashboardOverview"),
] as const;

const salesOrderTargets = [
	pathTarget("sales.getOrders"),
	pathTarget("sales.getOrdersSummary"),
	pathTarget("filters.salesOrders"),
	...salesDashboardTargets,
	...pageTabTargets,
] as const;

const salesQuoteTargets = [
	pathTarget("sales.quotes"),
	pathTarget("filters.salesQuotes"),
	...salesDashboardTargets,
	...pageTabTargets,
] as const;

const salesPaymentTargets = [
	...salesOrderTargets,
	pathTarget("sales.getSaleTransactions"),
	pathTarget("sales.getSalesAccountings"),
	pathTarget("sales.accountingIndex"),
] as const;

const salesProductionTargets = [
	...salesOrderTargets,
	pathTarget("filters.salesProductions"),
	pathTarget("sales.productionOverview"),
	pathTarget("sales.productions"),
	pathTarget("sales.productionsV2"),
	pathTarget("sales.productionDashboard"),
	pathTarget("sales.productionDashboardV2"),
	pathTarget("sales.productionTasks"),
] as const;

const salesDispatchTargets = [
	...salesOrderTargets,
	pathTarget("dispatch.index"),
	pathTarget("dispatch.dispatchSummary"),
	pathTarget("dispatch.orderDispatchOverview"),
	pathTarget("dispatch.dispatchOverviewV2"),
	pathTarget("dispatch.assignedDispatch"),
	pathTarget("dispatch.packingList"),
] as const;

const inventoryCatalogTargets = [
	pathTarget("inventories.inventoryProducts"),
	pathTarget("inventories.inventoryVariantsWorkspace"),
	pathTarget("inventories.inventoryCategories"),
	pathTarget("inventories.inventorySuppliers"),
	pathTarget("inventories.inventoryItemDashboard"),
] as const;

const inventoryStockTargets = [
	...inventoryCatalogTargets,
	...salesOrderTargets,
	pathTarget("inventories.stockAuditVerificationReport"),
	pathTarget("inventories.pendingAllocations"),
	pathTarget("inventories.salesBackorderQueue"),
	pathTarget("inventories.salesProductionPlan"),
	pathTarget("inventories.salesPartialShipmentQueue"),
] as const;

const inventoryInboundTargets = [
	...inventoryStockTargets,
	pathTarget("inventories.inboundShipments"),
	pathTarget("inventories.inboundDemandQueue"),
	pathTarget("inventories.supplierReorderSuggestions"),
	pathTarget("inventories.inboundStatusDemandReconciliation"),
	pathTarget("sales.inboundSummary"),
	pathTarget("sales.inboundIndex"),
] as const;

const jobsTargets = [
	pathTarget("jobs.getJobs"),
	pathTarget("jobs.overview"),
	...pageTabTargets,
] as const;

export const QUERY_EVENTS = {
	"sales.order.changed": {
		includeSalesOverview: true,
		targets: salesOrderTargets,
	},
	"sales.quote.changed": {
		includeSalesOverview: true,
		targets: salesQuoteTargets,
	},
	"sales.payment.changed": {
		includeSalesOverview: true,
		targets: salesPaymentTargets,
	},
	"sales.production.changed": {
		includeSalesOverview: true,
		targets: salesProductionTargets,
	},
	"sales.dispatch.changed": {
		includeSalesOverview: true,
		targets: salesDispatchTargets,
	},
	"inventory.catalog.changed": {
		targets: inventoryCatalogTargets,
	},
	"inventory.stock.changed": {
		includeSalesOverview: true,
		targets: inventoryStockTargets,
	},
	"inventory.inbound.changed": {
		includeSalesOverview: true,
		targets: inventoryInboundTargets,
	},
	"inventory.allocation.changed": {
		includeSalesOverview: true,
		targets: inventoryStockTargets,
	},
	"inventory.fulfillment.changed": {
		includeSalesOverview: true,
		targets: [
			...inventoryStockTargets,
			...salesDispatchTargets,
			...salesProductionTargets,
		],
	},
	"jobs.changed": {
		targets: jobsTargets,
	},
	"jobs.payment.changed": {
		targets: [...jobsTargets, pathTarget("jobs.contractorPayoutOverview")],
	},
	"hrm.employee.changed": {
		targets: [pathTarget("hrm.getEmployees"), ...pageTabTargets],
	},
	"page-tabs.changed": {
		targets: pageTabTargets,
	},
} as const satisfies Record<string, QueryEventDefinition>;

export type QueryEventName = keyof typeof QUERY_EVENTS;

export type QueryEvent = {
	name: QueryEventName;
	scope?: QueryEventScope;
};

export const MUTATION_QUERY_EVENTS = {
	"dispatch.bulkAssignDriver": ["sales.dispatch.changed"],
	"dispatch.bulkCancel": ["sales.dispatch.changed"],
	"dispatch.cancelDispatch": ["sales.dispatch.changed"],
	"dispatch.createDispatch": ["sales.dispatch.changed"],
	"dispatch.deleteDispatch": ["sales.dispatch.changed"],
	"dispatch.restore": ["sales.dispatch.changed"],
	"dispatch.sendSaleForPickup": ["sales.dispatch.changed"],
	"dispatch.signPackingSlip": ["sales.dispatch.changed"],
	"dispatch.startDispatch": ["sales.dispatch.changed"],
	"dispatch.submitDispatch": ["sales.dispatch.changed"],
	"dispatch.updateDispatchDriver": ["sales.dispatch.changed"],
	"dispatch.updateDispatchDueDate": ["sales.dispatch.changed"],
	"dispatch.updateDispatchStatus": ["sales.dispatch.changed"],
	"dispatch.updateSalesDeliveryOption": ["sales.dispatch.changed"],
	"hrm.restoreEmployeeAccess": ["hrm.employee.changed"],
	"hrm.revokeEmployee": ["hrm.employee.changed"],
	"hrm.saveEmployee": ["hrm.employee.changed"],
	"hrm.setEmployeeBugReportingAccess": ["hrm.employee.changed"],
	"hrm.updateEmployeeProfile": ["hrm.employee.changed"],
	"hrm.updateEmployeeRole": ["hrm.employee.changed"],
	"inventories.adjustInventoryStock": ["inventory.stock.changed"],
	"inventories.allocateReceivedInboundToBackorders": [
		"inventory.fulfillment.changed",
	],
	"inventories.approveBulkStockAllocation": ["inventory.allocation.changed"],
	"inventories.approveStockAllocation": ["inventory.allocation.changed"],
	"inventories.assignInboundDemands": ["inventory.inbound.changed"],
	"inventories.assignInventoryDispatchAllocations": [
		"inventory.fulfillment.changed",
	],
	"inventories.createInboundShipment": ["inventory.inbound.changed"],
	"inventories.createInboundShipmentFromDemands": ["inventory.inbound.changed"],
	"inventories.deleteInventories": ["inventory.catalog.changed"],
	"inventories.deleteInventoryCategory": ["inventory.catalog.changed"],
	"inventories.deleteInventorySupplier": ["inventory.catalog.changed"],
	"inventories.fulfillInventoryDispatch": ["inventory.fulfillment.changed"],
	"inventories.packInventoryDispatchAllocations": [
		"inventory.fulfillment.changed",
	],
	"inventories.receiveInboundShipment": ["inventory.inbound.changed"],
	"inventories.rejectStockAllocation": ["inventory.allocation.changed"],
	"inventories.releaseInventoryDispatchAllocations": [
		"inventory.fulfillment.changed",
	],
	"inventories.resolveInboundItemIssue": ["inventory.inbound.changed"],
	"inventories.saveInventory": ["inventory.catalog.changed"],
	"inventories.saveInventoryCategory": ["inventory.catalog.changed"],
	"inventories.saveInventorySupplier": ["inventory.catalog.changed"],
	"inventories.saveSupplierVariantForm": ["inventory.catalog.changed"],
	"inventories.setSalesInventoryLineFulfillmentHold": [
		"inventory.fulfillment.changed",
	],
	"inventories.shipAvailableSalesInventory": ["inventory.fulfillment.changed"],
	"inventories.syncInventorySuppliersFromDyke": ["inventory.catalog.changed"],
	"inventories.updateCategoryProductKind": ["inventory.catalog.changed"],
	"inventories.updateCategoryStockMode": ["inventory.catalog.changed"],
	"inventories.updateInboundShipmentStatus": ["inventory.inbound.changed"],
	"inventories.updateSubCategory": ["inventory.catalog.changed"],
	"inventories.updateSubComponent": ["inventory.catalog.changed"],
	"inventories.updateSubComponentStatus": ["inventory.catalog.changed"],
	"inventories.updateVariantCost": ["inventory.catalog.changed"],
	"inventories.updateVariantStatus": ["inventory.catalog.changed"],
	"jobs.cancelContractorPayment": ["jobs.payment.changed"],
	"jobs.createPaymentPortal": ["jobs.payment.changed"],
	"jobs.deleteJob": ["jobs.changed"],
	"jobs.jobReview": ["jobs.changed"],
	"jobs.reAssignJob": ["jobs.changed"],
	"jobs.reverseCancelledContractorPayment": ["jobs.payment.changed"],
	"newSalesForm.saveDraft": ["sales.order.changed"],
	"newSalesForm.saveFinal": ["sales.order.changed"],
	"pageTabs.create": ["page-tabs.changed"],
	"pageTabs.delete": ["page-tabs.changed"],
	"pageTabs.reorder": ["page-tabs.changed"],
	"pageTabs.update": ["page-tabs.changed"],
	"sales.copySale": ["sales.order.changed", "sales.quote.changed"],
	"sales.deleteSale": ["sales.order.changed", "sales.quote.changed"],
	"sales.deleteSalesByOrderIds": ["sales.order.changed", "sales.quote.changed"],
	"sales.markLatestPaymentReviewed": ["sales.payment.changed"],
	"sales.moveSale": ["sales.order.changed", "sales.quote.changed"],
	"sales.resolvePayment": ["sales.payment.changed"],
	"sales.transferSalesRep": ["sales.order.changed"],
	"sales.updatePaymentMethod": ["sales.payment.changed"],
	"sales.updatePriority": ["sales.order.changed"],
	"salesPaymentProcessor.applyPayment": ["sales.payment.changed"],
	"checkout.verifyPayment": ["sales.payment.changed"],
} as const satisfies Partial<Record<MutationRoute, readonly QueryEventName[]>>;

export type MappedMutationRoute = keyof typeof MUTATION_QUERY_EVENTS;

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === "object" && value !== null;
}

function getString(value: Record<string, unknown>, ...keys: readonly string[]) {
	for (const key of keys) {
		const candidate = value[key];
		if (typeof candidate === "string" && candidate.trim()) {
			return candidate;
		}
	}
}

function getNumber(value: Record<string, unknown>, ...keys: readonly string[]) {
	for (const key of keys) {
		const candidate = value[key];
		if (typeof candidate === "number" && Number.isFinite(candidate)) {
			return candidate;
		}
	}
}

function getSalesType(
	value: Record<string, unknown>,
	fallback: SalesQueryRef["salesType"],
) {
	const candidate = getString(value, "salesType", "type");
	return candidate === "quote" ? "quote" : fallback;
}

function toSalesQueryRef(
	value: unknown,
	fallbackType: SalesQueryRef["salesType"] = "order",
): SalesQueryRef | null {
	if (!isRecord(value)) return null;

	const orderNo = getString(value, "orderNo", "orderId", "slug");
	if (!orderNo) return null;

	const salesId = getNumber(value, "salesId", "id");
	return {
		orderNo,
		...(salesId === undefined ? {} : { salesId }),
		salesType: getSalesType(value, fallbackType),
	};
}

function extractMutationSalesRefs(
	route: MappedMutationRoute | null,
	data: unknown,
	variables: unknown,
) {
	if (!route) return [];
	const result = isRecord(data) ? data : {};
	const input = isRecord(variables) ? variables : {};

	let candidates: readonly unknown[] = [];
	switch (route) {
		case "sales.markLatestPaymentReviewed":
			candidates = [result.order];
			break;
		case "checkout.verifyPayment":
		case "salesPaymentProcessor.applyPayment":
			candidates = Array.isArray(result.appliedSales)
				? result.appliedSales
				: [];
			break;
		case "sales.transferSalesRep":
			candidates = [result.order];
			break;
		case "sales.copySale":
			candidates = [
				{
					...result,
					salesType:
						input.as === "quote" || input.to === "quote" ? "quote" : "order",
				},
			];
			break;
		case "sales.moveSale":
			candidates = [
				{
					...result,
					salesType: input.to === "quote" ? "quote" : "order",
				},
				{
					orderId: input.salesUid,
					salesType: input.type === "quote" ? "quote" : "order",
				},
			];
			break;
		case "inventories.assignInventoryDispatchAllocations":
		case "inventories.fulfillInventoryDispatch":
		case "inventories.packInventoryDispatchAllocations":
		case "inventories.releaseInventoryDispatchAllocations":
		case "inventories.setSalesInventoryLineFulfillmentHold":
		case "inventories.shipAvailableSalesInventory":
			candidates = [result.sale];
			break;
		case "newSalesForm.saveDraft":
		case "newSalesForm.saveFinal":
		case "sales.updatePaymentMethod":
		case "sales.updatePriority":
			candidates = [result, input];
			break;
		default:
			return [];
	}

	return candidates
		.map((candidate) => toSalesQueryRef(candidate))
		.filter((candidate): candidate is SalesQueryRef => candidate !== null);
}

function mergeSalesRefs(
	...groups: readonly (readonly SalesQueryRef[] | undefined)[]
) {
	const refs = new Map<string, SalesQueryRef>();
	for (const group of groups) {
		for (const ref of group ?? []) {
			if (!ref.orderNo) continue;
			refs.set(`${ref.salesType}:${ref.orderNo}`, ref);
		}
	}
	return Array.from(refs.values());
}

function createScope(
	route: MappedMutationRoute | null,
	data: unknown,
	variables: unknown,
	metaScope?: QueryEventScope,
) {
	const sales = mergeSalesRefs(
		metaScope?.sales,
		extractMutationSalesRefs(route, data, variables),
	);
	if (!sales.length) return metaScope;

	return {
		...metaScope,
		sales,
	};
}

export function resolveQueryEventTargets(event: QueryEvent) {
	const definition = QUERY_EVENTS[event.name] as QueryEventDefinition;
	if (!definition.includeSalesOverview) return definition.targets;

	const sales = event.scope?.sales;
	const overviewTargets = sales?.length
		? sales.map((sale) =>
				queryTarget("sales.getSaleOverview", {
					orderNo: sale.orderNo,
					salesType: sale.salesType,
				}),
			)
		: [pathTarget("sales.getSaleOverview")];

	return [...definition.targets, ...overviewTargets];
}

export function getMutationRoute(
	mutationKey: readonly unknown[] | undefined,
): MappedMutationRoute | null {
	const path = mutationKey?.[0];
	if (!Array.isArray(path) || !path.every((part) => typeof part === "string")) {
		return null;
	}

	const route = path.join(".") as MappedMutationRoute;
	return route in MUTATION_QUERY_EVENTS ? route : null;
}

export function resolveMutationQueryEvents({
	data,
	metaEvents,
	metaScope,
	mutationKey,
	variables,
}: {
	data?: unknown;
	metaEvents?: readonly QueryEventName[] | false;
	metaScope?: QueryEventScope;
	mutationKey?: readonly unknown[];
	variables?: unknown;
}): QueryEvent[] {
	if (metaEvents === false) return [];

	const route = getMutationRoute(mutationKey);
	let routeEvents: readonly QueryEventName[] = route
		? MUTATION_QUERY_EVENTS[route]
		: [];
	if (
		(route === "newSalesForm.saveDraft" ||
			route === "newSalesForm.saveFinal") &&
		isRecord(data)
	) {
		routeEvents =
			getSalesType(data, "order") === "quote"
				? ["sales.quote.changed"]
				: ["sales.order.changed"];
	}
	if (
		route === "salesPaymentProcessor.applyPayment" &&
		isRecord(data) &&
		data.terminalPaymentSession &&
		(!Array.isArray(data.appliedSales) || data.appliedSales.length === 0)
	) {
		routeEvents = [];
	}
	if (
		route === "checkout.verifyPayment" &&
		(!isRecord(data) || data.status !== "COMPLETED")
	) {
		routeEvents = [];
	}
	const scope = createScope(route, data, variables, metaScope);

	return Array.from(
		new Set([...(routeEvents ?? []), ...(metaEvents ?? [])]),
		(name) => ({
			name,
			...(scope ? { scope } : {}),
		}),
	);
}
