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
} from "@api/schemas/sales";
import { communityRouters } from "@api/trpc/routers/community.route";
import { dispatchRouters } from "@api/trpc/routers/dispatch.route";
import {
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
