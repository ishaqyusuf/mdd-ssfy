import { expect, it } from "bun:test";
import { salesPaymentActivity } from "./sales-payment";

it("confirms only applied sales and never treats terminal checkout creation as payment", () => {
	const ids = [1, 2];
	const invocation = salesPaymentActivity("owner").describe({ salesIds: ids });
	ids.push(3);
	expect(invocation.entityIds).toEqual([1, 2]);
	expect(
		invocation
			.resolve({ status: "success", appliedSalesIds: [1] })
			.map((row) => row.phase),
	).toEqual(["success", "unknown"]);
	expect(
		invocation.resolve({ status: null, appliedSalesIds: [1] })[0]?.phase,
	).toBe("unknown");
	expect(
		invocation.resolve({
			status: "success",
			terminalPaymentSession: {},
			appliedSalesIds: [1],
		})[0]?.label,
	).toBe("Awaiting terminal payment");
	expect(
		invocation.resolve({ status: "success", appliedSalesIds: [1, 1] })[0]
			?.phase,
	).toBe("unknown");
});
