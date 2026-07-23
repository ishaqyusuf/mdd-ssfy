import { describe, expect, it } from "bun:test";
import type { TRPCContext } from "@api/trpc/init";
import {
	createOrUpdateCustomer,
	createOrUpdateCustomerAddress,
} from "./customer";

function createDealerOwnedCustomerContext() {
	let customerUpdateCalls = 0;
	let addressWriteCalls = 0;
	const tx = {
		customers: {
			findUnique: async () => ({ dealerOwnerId: 71 }),
			update: async () => {
				customerUpdateCalls += 1;
			},
		},
		addressBooks: {
			create: async () => {
				addressWriteCalls += 1;
			},
			update: async () => {
				addressWriteCalls += 1;
			},
		},
	};

	return {
		ctx: {
			db: {
				$transaction: async (run: (client: typeof tx) => unknown) => run(tx),
			},
		} as unknown as TRPCContext,
		getWrites: () => ({ addressWriteCalls, customerUpdateCalls }),
	};
}

describe("office customer ownership boundaries", () => {
	it("rejects profile edits for dealer-owned customers", async () => {
		const { ctx, getWrites } = createDealerOwnedCustomerContext();

		await expect(
			createOrUpdateCustomer(ctx, {
				customerType: "Personal",
				existingCustomers: null,
				id: 42,
				name: "Dealer Customer",
				phoneNo: "555-0100",
				profileId: "1",
			}),
		).rejects.toMatchObject({
			code: "FORBIDDEN",
			message: "Dealer-owned customers are read-only in office mode.",
		});
		expect(getWrites()).toEqual({
			addressWriteCalls: 0,
			customerUpdateCalls: 0,
		});
	});

	it("rejects address edits for dealer-owned customers", async () => {
		const { ctx, getWrites } = createDealerOwnedCustomerContext();

		await expect(
			createOrUpdateCustomerAddress(ctx, {
				addressOnly: true,
				customerId: 42,
				customerType: "Personal",
				existingCustomers: null,
				name: "Dealer Customer",
				phoneNo: "555-0100",
				profileId: "1",
			}),
		).rejects.toMatchObject({
			code: "FORBIDDEN",
			message: "Dealer-owned customers are read-only in office mode.",
		});
		expect(getWrites()).toEqual({
			addressWriteCalls: 0,
			customerUpdateCalls: 0,
		});
	});
});
