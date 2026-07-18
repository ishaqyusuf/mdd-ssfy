import { describe, expect, it } from "bun:test";
import {
	createSalesPaymentPayrollIfAvailable,
	queueSalesCustomerPaymentReceipt,
} from "./sales-payment-processor";

describe("queueSalesCustomerPaymentReceipt", () => {
	const ctx = {
		db: {},
		userId: 9,
	};
	const payment = {
		notifyCustomer: true,
		sales: [
			{
				salesId: 10,
				orderId: "ORD-10",
				amountApplied: 100,
				remainingDue: 0,
			},
		],
		paymentMethod: "cash",
		totalAmount: 100,
	};

	it("does not queue a receipt unless it was explicitly requested", async () => {
		for (const notifyCustomer of [undefined, null, false]) {
			let called = false;
			const status = await queueSalesCustomerPaymentReceipt(
				ctx as never,
				{ ...payment, notifyCustomer },
				{
					buildPayload: async () => {
						called = true;
						return {} as never;
					},
					send: async () => {},
				},
			);

			expect(status).toBe("not_requested");
			expect(called).toBe(false);
		}
	});

	it("queues a requested customer receipt", async () => {
		const sent: unknown[] = [];
		const status = await queueSalesCustomerPaymentReceipt(
			ctx as never,
			payment,
			{
				buildPayload: async () =>
					({ customerEmail: "customer@example.com" }) as never,
				send: async (payload) => {
					sent.push(payload);
				},
			},
		);

		expect(status).toBe("queued");
		expect(sent).toEqual([{ customerEmail: "customer@example.com" }]);
	});

	it("reports a failed receipt without rejecting the recorded payment", async () => {
		const status = await queueSalesCustomerPaymentReceipt(
			ctx as never,
			payment,
			{
				buildPayload: async () => ({ customerEmail: "customer@example.com" }) as never,
				send: async () => {
					throw new Error("receipt unavailable");
				},
			},
		);

		expect(status).toBe("failed");
	});
});

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
