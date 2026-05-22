import { describe, expect, it } from "bun:test";
import { getOrdersV2SummarySchema } from "@api/db/queries/sales-orders-v2";
import {
	getUnitInvoiceAgingReportSchema,
	getUnitInvoiceTaskDetailReportSchema,
} from "@api/db/queries/unit-invoice-reports";
import { getUnitProductionSummarySchema } from "@api/db/queries/unit-productions";
import {
	dispatchQueryParamsSchema,
	exportDispatchesSchema,
	getSaleOverviewSchema,
} from "@api/schemas/sales";
import { communityRouters } from "@api/trpc/routers/community.route";
import { dispatchRouters } from "@api/trpc/routers/dispatch.route";
import { updateVariantStatusSchema } from "@gnd/inventory/inventory";
import { parseTaskEventConfig } from "@gnd/jobs/task-events/registry";
import {
	jobAssignedTags,
	salesCustomerPaymentFailedSchema,
	userSchema,
} from "@gnd/notifications/schemas";
import {
	appDownloadSettings,
	installCostSettings,
} from "../../../../packages/settings/src/schema";

describe("server schema evaluation", () => {
	it("imports affected schema and router modules without runtime derivation crashes", () => {
		expect(communityRouters).toBeDefined();
		expect(dispatchRouters).toBeDefined();

		expect(getOrdersV2SummarySchema.parse({ bin: true })).toEqual({
			bin: true,
		});
		expect(getUnitInvoiceAgingReportSchema.parse({ bin: false })).toEqual({
			bin: false,
		});
		expect(getUnitInvoiceTaskDetailReportSchema.parse({})).toEqual({});
		expect(getUnitProductionSummarySchema.parse({ q: "cedar" })).toEqual({
			q: "cedar",
		});
		expect(
			dispatchQueryParamsSchema.parse({
				tab: "pending",
				q: "order",
				size: 20,
			}),
		).toEqual({
			tab: "pending",
			q: "order",
			size: 20,
		});
		expect(
			exportDispatchesSchema.parse({ sort: ["createdAt"], q: "due" }),
		).toEqual({
			sort: ["createdAt"],
			q: "due",
		});
		expect(
			getSaleOverviewSchema.parse({ orderNo: "ORD-101", salesType: "order" }),
		).toEqual({
			orderNo: "ORD-101",
			salesType: "order",
		});
		expect(
			parseTaskEventConfig("sales-pending-bill-reminder-schedule", {
				filter: { orderNo: "ORD-101" },
			}).filter,
		).toEqual({
			orderNo: "ORD-101",
		});
		expect(
			updateVariantStatusSchema.parse({
				status: "published",
				uid: "variant-1",
				inventoryId: 1,
			}),
		).toEqual({
			status: "published",
			uid: "variant-1",
			inventoryId: 1,
		});
		expect(
			installCostSettings.parse({
				type: "install-price-chart",
				meta: {},
			}).meta,
		).toEqual({ list: [] });
		expect(
			appDownloadSettings.parse({
				type: "app-download-apk",
				meta: {},
			}).meta,
		).toEqual({});
		expect(userSchema.parse({ id: 1, name: "Ada", email: null })).toEqual({
			id: 1,
			name: "Ada",
			email: null,
		});
		expect(
			jobAssignedTags.parse({
				id: 1,
				type: "job_assigned",
				assignedToId: 2,
			}),
		).toEqual({
			id: 1,
			type: "job_assigned",
			source: "system",
			priority: 5,
			assignedToId: 2,
		});
		expect(
			salesCustomerPaymentFailedSchema.parse({
				customerEmail: "customer@example.com",
				customerName: "Customer",
				sales: [
					{
						salesId: 101,
						orderNo: "ORD-101",
						amountApplied: 50,
						remainingDue: 25,
					},
				],
			}).sales[0],
		).toEqual({
			salesId: 101,
			orderNo: "ORD-101",
			remainingDue: 25,
		});
	});
});
