import { describe, expect, test } from "bun:test";
import { SalesOverviewGeneralV2Include } from "./sales-overview-general-v2";

describe("Sales Overview General V2 projection", () => {
	test("keeps General dependencies and excludes non-General relation families", () => {
		for (const dependency of [
			"customer",
			"billingAddress",
			"shippingAddress",
			"salesRep",
			"stat",
			"extraCosts",
			"productionGate",
			"taxes",
			"payments",
			"deliveries",
		]) {
			expect(dependency in SalesOverviewGeneralV2Include).toBe(true);
		}

		for (const excluded of ["items", "salesProfile"]) {
			expect(excluded in SalesOverviewGeneralV2Include).toBe(false);
		}
		expect(SalesOverviewGeneralV2Include.deliveries).toMatchObject({
			take: 1,
			select: { id: true, deliveryMode: true, dueDate: true },
		});
	});

	test("keeps payment provider evidence required by grouped settlement", () => {
		const payments = SalesOverviewGeneralV2Include.payments;
		expect(payments.select.transaction).toBeDefined();
		expect(payments.select.squarePayments).toBeDefined();
		expect(payments.select.meta).toBe(true);
	});
});
