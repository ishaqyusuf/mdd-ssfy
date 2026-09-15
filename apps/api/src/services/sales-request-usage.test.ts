import { expect, test } from "bun:test";
import { requireSalesRequestUsage } from "./sales-request-usage";

test("allows five reservations and rejects the sixth", async () => {
	await requireSalesRequestUsage(7, async () => 5);
	await expect(
		requireSalesRequestUsage(7, async () => 6),
	).rejects.toMatchObject({ code: "TOO_MANY_REQUESTS" });
});

test("usage store failure and malformed responses fail closed", async () => {
	await expect(
		requireSalesRequestUsage(7, async () => {
			throw new Error("offline");
		}),
	).rejects.toMatchObject({ code: "SERVICE_UNAVAILABLE" });
	await expect(
		requireSalesRequestUsage(7, async () => null),
	).rejects.toMatchObject({ code: "SERVICE_UNAVAILABLE" });
});

test("allows a healthy store response beyond the old 1.5-second deadline", async () => {
	await requireSalesRequestUsage(
		7,
		() => new Promise((resolve) => setTimeout(() => resolve(1), 1600)),
	);
});
