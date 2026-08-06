import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";

function source(name: string) {
	return readFileSync(new URL(`./${name}`, import.meta.url), "utf8");
}

function expectProtectedMutation(
	routerSource: string,
	mutation: string,
	requiredGuard: string,
) {
	const start = routerSource.indexOf(`${mutation}: protectedProcedure`);
	expect(start).toBeGreaterThanOrEqual(0);
	expect(routerSource.slice(start, start + 1800)).toContain(requiredGuard);
}

describe("high-risk tRPC permission boundaries", () => {
	test("employee administration is not exposed as anonymous mutations", () => {
		const hrm = source("hrm.route.ts");
		for (const mutation of [
			"resetEmployeePassword",
			"deleteEmployee",
			"revokeEmployee",
			"restoreEmployeeAccess",
			"setEmployeeBugReportingAccess",
			"saveEmployee",
			"getEmployeeForm",
		]) {
			expect(hrm).toContain(`${mutation}: protectedProcedure`);
		}
	});

	test("profile, document, and notification writes require a session", () => {
		const user = source("user.route.ts");
		for (const mutation of [
			"updateProfile",
			"changePassword",
			"saveDocument",
			"uploadDocumentAsset",
			"saveDocumentReviewNote",
			"deleteDocument",
			"updateNotificationPreferences",
		]) {
			expect(user).toContain(`${mutation}: protectedProcedure`);
		}
		const storage = source("storage.route.ts");
		for (const mutation of ["upload", "delete"]) {
			expect(storage).toContain(`${mutation}: protectedProcedure`);
		}

		const notes = source("notes.route.ts");
		for (const mutation of [
			"syncNotificationChannels",
			"updateNotificationChannel",
			"addNotificationChannelRole",
			"removeNotificationChannelRole",
			"addNotificationChannelSubscriber",
			"removeNotificationChannelSubscriber",
			"saveInboundNote",
			"saveNote",
		]) {
			expect(notes).toContain(`${mutation}: protectedProcedure`);
		}
	});

	test("inventory import, reset, projection, and delete routes require a Super Admin operator", () => {
		const inventories = source("inventories.route.ts");
		for (const mutation of [
			"deleteInventories",
			"deleteInventoryCategory",
			"deleteSubComponent",
			"upsertShelfProducts",
			"upsertComponents",
			"runFullImport",
			"inventoryUpdateFromDyke",
			"syncInventorySuppliersFromDyke",
			"dykeUpdateFromInventory",
			"queueInventoryToDykeSync",
			"archiveInventoryImportSourceCandidates",
			"applyInventoryImportSourceDisposition",
			"applyInventoryImportSourceDispositionBatch",
			"inventoryImportProjectionHistory",
			"retryInventoryImportProjection",
			"cleanupInventoryImportCategories",
			"backfillInventoryProductKinds",
			"backfillInventoryImportSources",
			"resetInventorySystem",
		]) {
			const start = inventories.indexOf(`${mutation}: protectedProcedure`);
			expect(start).toBeGreaterThanOrEqual(0);
			expect(inventories.slice(start, start + 1600)).toContain(
				"requireInventoryImportOperator(props.ctx)",
			);
		}
	});

	test("dispatch writes require a session and the intended worker or manager permission", () => {
		const dispatch = source("dispatch.route.ts");
		for (const mutation of [
			"deletePackingItem",
			"cancelDispatch",
			"startDispatch",
			"submitDispatch",
			"completeDispatchWithProof",
			"updateSalesDeliveryOption",
			"updateDispatchDriver",
			"updateDispatchDueDate",
			"updateDispatchStatus",
			"sendSaleForPickup",
			"signPackingSlip",
			"resolveDuplicateGroup",
			"prepareNonProduceablePacking",
			"createDispatch",
			"deleteDispatch",
			"debugLog",
			"bulkAssignDriver",
			"bulkCancel",
			"restore",
		]) {
			expectProtectedMutation(dispatch, mutation, "await require");
		}
		expect(dispatch).not.toContain("uploadDispatchDocument:");
		const completionStart = dispatch.indexOf(
			"completeDispatchWithProof: protectedProcedure",
		);
		expect(dispatch.slice(completionStart, completionStart + 9000)).toContain(
			'{ isolationLevel: "Serializable" }',
		);
	});

	test("inventory configuration writes require a Super Admin operator", () => {
		const inventories = source("inventories.route.ts");
		for (const mutation of [
			"saveCommunityInput",
			"saveInventoryCategory",
			"saveInventory",
			"updateCategoryVariantAttribute",
			"updateCategoryStockMode",
			"updateInventoryProductKind",
			"updateCategoryProductKind",
			"updateSubCategory",
			"updateSubComponent",
			"updateSubComponentStatus",
			"updateVariantCost",
			"updateVariantStatus",
			"saveVariantForm",
		]) {
			expectProtectedMutation(
				inventories,
				mutation,
				"await requireInventoryImportOperator(props.ctx)",
			);
		}
	});

	test("sales status dependency resolution requires order, inbound, and production permissions", () => {
		const inventories = source("inventories.route.ts");
		expectProtectedMutation(
			inventories,
			"overrideSalesInventoryMarkAsAvailabilityForContinue",
			"await requireAnyOperationalPermission",
		);
		const start = inventories.indexOf(
			"overrideSalesInventoryMarkAsAvailabilityForContinue: protectedProcedure",
		);
		const mutationSource = inventories.slice(start, start + 2200);
		expect(mutationSource).toContain('"editOrders"');
		expect(mutationSource).toContain('"editInboundOrder"');
		expect(mutationSource).toContain('"editProduction"');
	});

	test("manual inventory need fulfillment requires order editing permission", () => {
		const inventories = source("inventories.route.ts");
		expectProtectedMutation(
			inventories,
			"fulfillSalesInventoryNeedsManually",
			"await requireAnyOperationalPermission",
		);
		const start = inventories.indexOf(
			"fulfillSalesInventoryNeedsManually: protectedProcedure",
		);
		expect(inventories.slice(start, start + 1400)).toContain('"editOrders"');
	});

	test("inbound demand reduction requires inbound-order editing permission", () => {
		const inventories = source("inventories.route.ts");
		expectProtectedMutation(
			inventories,
			"reduceInboundShipmentDemand",
			"await requireAnyOperationalPermission",
		);
		const start = inventories.indexOf(
			"reduceInboundShipmentDemand: protectedProcedure",
		);
		expect(inventories.slice(start, start + 900)).toContain(
			'["editInboundOrder"]',
		);
	});

	test("inventory fulfillment mutations repeat an operational capability check", () => {
		const inventories = source("inventories.route.ts");
		for (const mutation of [
			"shipAvailableSalesInventory",
			"setSalesInventoryLineFulfillmentHold",
			"assignInventoryDispatchAllocations",
			"packInventoryDispatchAllocations",
			"fulfillInventoryDispatch",
			"releaseInventoryDispatchAllocations",
		]) {
			expectProtectedMutation(
				inventories,
				mutation,
				"requireInventoryFulfillmentOperator",
			);
		}
		expectProtectedMutation(
			inventories,
			"allocateReceivedInboundToBackorders",
			"requireReceivedBackorderOperator",
		);
	});

	test("Sales Finance corrective resolution requires order-payment editing permission", () => {
		const finance = source("sales-finance.route.ts");
		for (const mutation of [
			"resolutionSyncBalance",
			"resolutionPayment",
			"reconciliationStart",
			"reconciliationResolve",
		]) {
			expectProtectedMutation(finance, mutation, '["editOrderPayment"]');
		}
	});

	test("sales dashboard reporting reads require an authenticated sales viewer", () => {
		const dashboard = source("sales-dashboard.route.ts");
		for (const procedure of [
			"getKpis",
			"getRevenueOverTime",
			"getRecentSales",
			"getTopProducts",
			"getSalesRepLeaderboard",
			"getSalesChannelBreakdown",
		]) {
			const start = dashboard.indexOf(`${procedure}: protectedProcedure`);
			expect(start).toBeGreaterThanOrEqual(0);
			expect(dashboard.slice(start, start + 700)).toContain(
				"await requireSalesReportingAccess(ctx)",
			);
		}
		expect(dashboard).not.toContain("publicProcedure");
	});

	test("sales performance exports require their dedicated permission", () => {
		const dashboard = source("sales-dashboard.route.ts");
		const start = dashboard.indexOf("report: protectedProcedure");
		expect(start).toBeGreaterThanOrEqual(0);
		expect(dashboard.slice(start, start + 900)).toContain(
			'["generateSalesPerformanceReport"]',
		);
		expect(dashboard.slice(start, start + 900)).toContain(
			"await requireSalesReportingAccess(ctx)",
		);
	});

	test("job assignment, review, payment, and creation writes are permission-shaped", () => {
		const jobs = source("jobs.route.ts");
		for (const mutation of [
			"restoreJob",
			"reAssignJob",
			"jobReview",
			"cancelPayment",
			"cancelContractorPayment",
			"reverseCancelledContractorPayment",
			"testActivity",
			"createPaymentPortal",
			"createJob",
		]) {
			expectProtectedMutation(jobs, mutation, "await requireJob");
		}
	});

	test("contractor finance reads require payment-manager access", () => {
		const jobs = source("jobs.route.ts");
		for (const procedure of [
			"paymentDashboard",
			"paymentPortal",
			"contractorPayouts",
			"contractorPayoutOverview",
			"getContractorPayoutPrintData",
			"contractorPeriodReport",
			"contractorAccountingPrintToken",
		]) {
			const start = jobs.indexOf(`${procedure}: protectedProcedure`);
			expect(start).toBeGreaterThanOrEqual(0);
			expect(jobs.slice(start, start + 1100)).toContain(
				"await requireJobPaymentViewer(props.ctx)",
			);
		}

		const filters = source("filters.route.ts");
		const filterStart = filters.indexOf("contractorPayout: protectedProcedure");
		expect(filterStart).toBeGreaterThanOrEqual(0);
		expect(filters.slice(filterStart, filterStart + 700)).toContain(
			"await requireAnyOperationalPermission",
		);
	});

	test("community writes require a scoped editor permission", () => {
		const community = source("community.route.ts");
		for (const mutation of [
			"createCommunityTemplateBlock",
			"updateInstallCost",
			"uploadCommunityProjectDocuments",
			"createCommunityModelCost",
			"saveUnitInvoiceForm",
			"deleteUnitInvoiceTasks",
			"saveJobForm",
			"importLegacyInstallCosts",
			"updateCommunityModelInstallTask",
			"deleteCommunityModelInstallCost",
			"reorderBuilderTaskInstallCosts",
			"updateInstallCostRate",
			"saveTemplateInputListing",
			"deleteCommunityModelCost",
			"deleteInputInventoryBlock",
			"deleteInputSchema",
			"deleteUnits",
			"sendProjectUnitsToProduction",
			"saveCommunityModelCostForm",
			"saveCommunityTemplateData",
			"deleteCommunityTemplate",
			"saveCommunityModelLegacy",
			"saveCommunityModel",
			"updateCommunityBlockInput",
			"updateCommunityBlockInputAnalytics",
			"updateRecordsIndicesIndices",
			"saveWorkOrderForm",
			"saveBuilder",
			"generateModelForUnit",
			"saveModelInstallTask",
			"upgradeBuilderToV2",
		]) {
			expectProtectedMutation(community, mutation, "await requireCommunity");
		}
	});

	test("work-order saves accept the customer-service editor capability", () => {
		const community = source("community.route.ts");
		const guardStart = community.indexOf(
			"async function requireWorkOrderEditor",
		);
		expect(guardStart).toBeGreaterThanOrEqual(0);
		expect(community.slice(guardStart, guardStart + 500)).toContain(
			'"editCustomerService"',
		);
		expectProtectedMutation(
			community,
			"saveWorkOrderForm",
			"await requireWorkOrderEditor(props.ctx)",
		);
	});

	test("shared settings writes are Super Admin-only", () => {
		const settings = source("settings.route.ts");
		expectProtectedMutation(
			settings,
			"updateSetting",
			"await requireSuperAdmin(ctx)",
		);
	});
});
