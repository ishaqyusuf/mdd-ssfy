import { describe, expect, it } from "bun:test";
import {
	MobileInvoiceSaveTimeoutError,
	isMobileInvoiceSaveTimeoutError,
	runMobileInvoiceSaveRequest,
} from "./mobile-save-timeout";

describe("runMobileInvoiceSaveRequest", () => {
	it("returns the save result when the request settles", async () => {
		const result = await runMobileInvoiceSaveRequest(
			() => Promise.resolve({ slug: "INV-1" }),
			100,
		);

		expect(result).toEqual({ slug: "INV-1" });
	});

	it("throws a timeout error when the request hangs", async () => {
		const startedAt = performance.now();
		const promise = runMobileInvoiceSaveRequest(
			() => new Promise<never>(() => {}),
			15,
		);

		await expect(promise).rejects.toBeInstanceOf(MobileInvoiceSaveTimeoutError);
		expect(performance.now() - startedAt).toBeLessThan(250);
	});

	it("recognizes timeout errors by instance or error name", () => {
		expect(
			isMobileInvoiceSaveTimeoutError(new MobileInvoiceSaveTimeoutError()),
		).toBe(true);
		const crossRealmLikeError = new Error("timed out");
		crossRealmLikeError.name = "MobileInvoiceSaveTimeoutError";

		expect(isMobileInvoiceSaveTimeoutError(crossRealmLikeError)).toBe(true);
		expect(isMobileInvoiceSaveTimeoutError(new Error("other"))).toBe(false);
	});
});
