import { expect, test } from "bun:test";
import { generalInboundSchema } from "./general-inbound";
test("general inbound accepts sale-independent variants and locations and rejects invalid counts", () => {
	const input = {
		idempotencyKey: crypto.randomUUID(),
		items: [
			{ inventoryVariantId: 1, qty: 5, location: " Aisle A ", unitPrice: 10 },
		],
	};
	expect(generalInboundSchema.parse(input).items[0]?.location).toBe("Aisle A");
	for (const qty of [0, -1, Number.NaN, Number.POSITIVE_INFINITY, 1_000_001])
		expect(
			generalInboundSchema.safeParse({
				...input,
				items: [{ ...input.items[0], qty }],
			}).success,
		).toBe(false);
	expect(generalInboundSchema.safeParse({ ...input, items: [] }).success).toBe(
		false,
	);
	expect(
		generalInboundSchema.safeParse({
			...input,
			items: [{ ...input.items[0], unitPrice: -1 }],
		}).success,
	).toBe(false);
});
