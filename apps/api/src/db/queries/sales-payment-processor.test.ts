import { describe, expect, it } from "bun:test";
import {
	createSalesPaymentPayrollIfAvailable,
	createTerminalPayment,
	queueSalesCustomerPaymentReceipt,
} from "./sales-payment-processor";

describe("createTerminalPayment", () => {
	const input = {
		accountNo: "cust-44",
		amount: 100,
		deviceId: "device:238CS149B2002443",
		orderNos: ["ORD-10"],
		paymentMethod: "terminal",
		salesIds: [10],
	};
	const pendingSale = {
		amountDue: 100,
		id: 10,
		meta: null,
		orderId: "ORD-10",
	};

	it("verifies the terminal and reaches Square before recording the checkout", async () => {
		const squareCalls: unknown[] = [];
		const writes: unknown[] = [];
		const ctx = {
			userId: 9,
			db: {
				squarePayments: {
					create: async (request: unknown) => {
						writes.push(request);
						return { id: 71, status: "PENDING" };
					},
				},
			},
		};

		const result = await createTerminalPayment(ctx as never, input as never, {
			createSquareTerminalCheckout: async (request) => {
				squareCalls.push(request);
				return { id: "checkout-1", squareOrderId: "square-order-1" };
			},
			getCustomerPendingSales: async () => [pendingSale] as never,
			getCustomerWallet: async () => null as never,
			getSquareDevices: async () => ({
				terminals: [
					{
						label: "Square Terminal 2443",
						status: "AVAILABLE",
						value: "device:238CS149B2002443",
					},
				],
			}),
			verifySquareTerminalReady: async () => undefined,
		});

		expect(result).toMatchObject({
			squareCheckout: { id: "checkout-1" },
			squarePaymentId: 71,
			status: "PENDING",
		});
		expect(squareCalls).toEqual([
			{
				allowTipping: undefined,
				amount: 103.5,
				deviceId: "device:238CS149B2002443",
				orderIds: ["ORD-10"],
			},
		]);
		expect(writes).toHaveLength(1);
		expect(writes[0]).toMatchObject({
			data: {
				paymentTerminal: {
					connectOrCreate: {
						create: {
							terminalId: "device:238CS149B2002443",
							terminalName: "Square Terminal 2443",
						},
					},
				},
			},
		});
	});

	it("rejects an unavailable terminal before calling Square or writing", async () => {
		let squareCalled = false;
		let wrote = false;
		const ctx = {
			userId: 9,
			db: {
				squarePayments: {
					create: async () => {
						wrote = true;
					},
				},
			},
		};

		expect(
			createTerminalPayment(ctx as never, input as never, {
				createSquareTerminalCheckout: async () => {
					squareCalled = true;
					return { id: "checkout-1", squareOrderId: "square-order-1" };
				},
				getCustomerPendingSales: async () => [pendingSale] as never,
				getCustomerWallet: async () => null as never,
				getSquareDevices: async () => ({
					terminals: [
						{
							label: "Square Terminal 2443",
							status: "OFFLINE",
							value: "device:238CS149B2002443",
						},
					],
				}),
				verifySquareTerminalReady: async () => undefined,
			}),
		).rejects.toThrow("offline or unavailable");
		expect(squareCalled).toBe(false);
		expect(wrote).toBe(false);
	});

	it("does not record a pending payment when Square rejects checkout", async () => {
		let wrote = false;
		const ctx = {
			userId: 9,
			db: {
				squarePayments: {
					create: async () => {
						wrote = true;
					},
				},
			},
		};

		expect(
			createTerminalPayment(ctx as never, input as never, {
				createSquareTerminalCheckout: async () => {
					throw new Error("Square checkout failed");
				},
				getCustomerPendingSales: async () => [pendingSale] as never,
				getCustomerWallet: async () => null as never,
				getSquareDevices: async () => ({
					terminals: [
						{
							label: "Square Terminal 2443",
							status: "AVAILABLE",
							value: "device:238CS149B2002443",
						},
					],
				}),
				verifySquareTerminalReady: async () => undefined,
			}),
		).rejects.toThrow("Square checkout failed");
		expect(wrote).toBe(false);
	});

	it("does not create a checkout when the terminal fails its live readiness check", async () => {
		let squareCalled = false;
		let wrote = false;
		const ctx = {
			userId: 9,
			db: {
				squarePayments: {
					create: async () => {
						wrote = true;
					},
				},
			},
		};

		expect(
			createTerminalPayment(ctx as never, input as never, {
				createSquareTerminalCheckout: async () => {
					squareCalled = true;
					return { id: "checkout-1", squareOrderId: "square-order-1" };
				},
				getCustomerPendingSales: async () => [pendingSale] as never,
				getCustomerWallet: async () => null as never,
				getSquareDevices: async () => ({
					terminals: [
						{
							label: "Square Terminal 2443",
							status: "AVAILABLE",
							value: "device:238CS149B2002443",
						},
					],
				}),
				verifySquareTerminalReady: async () => {
					throw new Error("Terminal is not responding in Connected mode");
				},
			}),
		).rejects.toThrow("not responding in Connected mode");
		expect(squareCalled).toBe(false);
		expect(wrote).toBe(false);
	});
});

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
				buildPayload: async () =>
					({ customerEmail: "customer@example.com" }) as never,
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
