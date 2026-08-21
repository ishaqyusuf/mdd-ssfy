import { describe, expect, test } from "bun:test";
import { updateSalesDeliveryOption } from "./dispatch";

function createContext() {
	const writes: Array<{ kind: string; input: unknown }> = [];
	return {
		writes,
		ctx: {
			db: {
				salesOrders: {
					update: async (input: unknown) => {
						writes.push({ kind: "sales-order", input });
					},
				},
				orderDelivery: {
					create: async (input: unknown) => {
						writes.push({ kind: "delivery-create", input });
						return { id: 91 };
					},
					update: async (input: unknown) => {
						writes.push({ kind: "delivery-update", input });
					},
				},
			},
		},
	};
}

describe("sales delivery option persistence", () => {
	test("persists both the option and date when no delivery exists yet", async () => {
		const { ctx, writes } = createContext();
		const date = new Date("2026-08-28T12:00:00.000Z");

		await updateSalesDeliveryOption(ctx as never, {
			salesId: 42,
			option: "delivery",
			date,
		});

		expect(writes.map((write) => write.kind)).toEqual([
			"sales-order",
			"delivery-create",
		]);
		expect(writes[1]).toEqual({
			kind: "delivery-create",
			input: {
				data: {
					deliveryMode: "delivery",
					createdBy: {},
					driver: undefined,
					status: "queue",
					dueDate: date,
					meta: {},
					order: { connect: { id: 42 } },
				},
			},
		});
	});

	test("does not create an empty delivery record for an option-only update", async () => {
		const { ctx, writes } = createContext();

		await updateSalesDeliveryOption(ctx as never, {
			salesId: 42,
			option: "pickup",
		});

		expect(writes.map((write) => write.kind)).toEqual(["sales-order"]);
	});
});
