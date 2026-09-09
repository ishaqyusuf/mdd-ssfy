import { describe, expect, test } from "bun:test";

import { getSpecialOrderSignalState } from "./special-order-signal";

describe("Special Order fulfillment signal", () => {
	test("shows only the current approved revision as signed", () => {
		expect(
			getSpecialOrderSignalState("YES", "CUSTOMER_APPROVED"),
		).toMatchObject({
			label: "Signed",
			variant: "success",
			detail: "Customer approved",
		});
	});

	test("keeps every governed non-approved state visibly not signed", () => {
		for (const [status, detail] of [
			["SIGNATURE_PENDING", "Signature pending"],
			["REAPPROVAL_REQUIRED", "Reapproval required"],
			["CUSTOMER_DECLINED", "Customer declined"],
		] as const) {
			expect(getSpecialOrderSignalState("YES", status)).toMatchObject({
				label:
					status === "CUSTOMER_DECLINED"
						? "Declined"
						: status === "REAPPROVAL_REQUIRED"
							? "Reapproval required"
							: "Awaiting signature",
				variant: status === "CUSTOMER_DECLINED" ? "destructive" : "outline",
				detail,
			});
		}
	});

	test("does not mark a non-special order red", () => {
		expect(getSpecialOrderSignalState("NO", "NOT_REQUIRED")).toEqual({
			label: "Not special order",
			variant: "outline",
			detail: "Approval not required",
		});
	});
});
