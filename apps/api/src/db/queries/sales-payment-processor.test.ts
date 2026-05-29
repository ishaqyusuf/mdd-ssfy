import { describe, expect, it } from "bun:test";
import { createSalesPaymentPayrollIfAvailable } from "./sales-payment-processor";

describe("createSalesPaymentPayrollIfAvailable", () => {
	it("skips payroll when a paid order has no sales rep", async () => {
		let payrollCreated = false;
		const tx = {
			employeeProfile: {
				findFirst: async () => null,
			},
			payroll: {
				create: async () => {
					payrollCreated = true;
				},
			},
		};

		const created = await createSalesPaymentPayrollIfAvailable(tx, {
			id: 10,
			amount: 100,
			order: {
				id: 20,
				salesRep: null,
			},
		});

		expect(created).toBe(false);
		expect(payrollCreated).toBe(false);
	});

	it("creates payroll when the paid order has a sales rep", async () => {
		const payrollWrites: unknown[] = [];
		const tx = {
			employeeProfile: {
				findFirst: async () => ({ salesComissionPercentage: 10 }),
			},
			payroll: {
				create: async (input: unknown) => {
					payrollWrites.push(input);
				},
			},
		};

		const created = await createSalesPaymentPayrollIfAvailable(tx, {
			id: 10,
			amount: 100,
			order: {
				id: 20,
				salesRep: { id: 30 },
			},
		});

		expect(created).toBe(true);
		expect(payrollWrites).toHaveLength(1);
		expect(payrollWrites[0]).toMatchObject({
			data: {
				amount: 10,
				orderId: 20,
				userId: 30,
				uid: "oid:20,pid:10",
			},
		});
	});
});
