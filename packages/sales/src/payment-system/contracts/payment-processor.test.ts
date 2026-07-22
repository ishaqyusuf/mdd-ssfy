import { describe, expect, it } from "bun:test";
import { salesPaymentProcessorApplyPaymentSchema } from "./payment-processor";

const basePayment = {
	accountNo: "555-111-2222",
	amount: 500,
	paymentMethod: "credit-card" as const,
	salesIds: [1],
};

describe("sales payment processor contract", () => {
	it("allows overpayment custom amounts", () => {
		const result = salesPaymentProcessorApplyPaymentSchema.safeParse({
			...basePayment,
			_amount: "600",
		});

		expect(result.success).toBe(true);
	});

	it("allows wallet-only payments with zero external amount", () => {
		const result = salesPaymentProcessorApplyPaymentSchema.safeParse({
			...basePayment,
			amount: 0,
			paymentMethod: "wallet",
			useWallet: true,
		});

		expect(result.success).toBe(true);
	});

	it("rejects zero external amount without wallet", () => {
		const result = salesPaymentProcessorApplyPaymentSchema.safeParse({
			...basePayment,
			amount: 0,
		});

		expect(result.success).toBe(false);
	});

	it("requires a device for terminal payments", () => {
		const missingDevice = salesPaymentProcessorApplyPaymentSchema.safeParse({
			...basePayment,
			paymentMethod: "terminal",
		});
		const selectedDevice = salesPaymentProcessorApplyPaymentSchema.safeParse({
			...basePayment,
			deviceId: "device:238CS149B2002443",
			paymentMethod: "terminal",
		});

		expect(missingDevice.success).toBe(false);
		expect(selectedDevice.success).toBe(true);
	});
});
