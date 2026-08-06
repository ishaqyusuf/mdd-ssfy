import { describe, expect, it } from "bun:test";
import {
	assignSalesAddress,
	createOrUpdateCustomer,
	getSalesCustomer,
} from "./customer";

async function runAssignment({
	billingAddressId,
	completedDeliveryItems = 0,
	requestedAddressId,
	dealerOwnerId = null,
	orderStatus = "Processing",
	recipientName = "Shipping Recipient",
	saleFound = true,
	shippingAddressId,
	salesReferenceCount,
}: {
	billingAddressId: number;
	completedDeliveryItems?: number;
	requestedAddressId?: number | null;
	dealerOwnerId?: number | null;
	orderStatus?: string | null;
	recipientName?: string;
	saleFound?: boolean;
	shippingAddressId: number | null;
	salesReferenceCount: number;
}) {
	type MutationArgs = { data: Record<string, unknown> };
	const calls: {
		addressCreate: MutationArgs | null;
		addressUpdate: number;
		saleUpdate: MutationArgs | null;
	} = {
		addressCreate: null,
		addressUpdate: 0,
		saleUpdate: null,
	};
	const tx = {
		customers: {
			findUnique: async () => ({ dealerOwnerId }),
		},
		salesOrders: {
			findFirst: async () =>
				saleFound
					? {
							billingAddressId,
							deliveries:
								completedDeliveryItems > 0
									? [
											{
												_count: { items: completedDeliveryItems },
												status: "completed",
											},
										]
									: [],
							id: 77,
							status: orderStatus,
							shippingAddressId,
						}
					: null,
			count: async () => salesReferenceCount,
			update: async (args: MutationArgs) => {
				calls.saleUpdate = args;
				return { id: 77 };
			},
		},
		addressBooks: {
			findFirst: async () => ({ id: requestedAddressId ?? shippingAddressId }),
			create: async (args: MutationArgs) => {
				calls.addressCreate = args;
				return { id: 909 };
			},
			update: async () => {
				calls.addressUpdate += 1;
				return { id: requestedAddressId ?? shippingAddressId };
			},
		},
	};
	const ctx = {
		db: {
			$transaction: async (run: (client: typeof tx) => unknown) => run(tx),
		},
	} as unknown as Parameters<typeof assignSalesAddress>[0];

	const result = await assignSalesAddress(ctx, {
		address1: "900 Shipping Rd",
		...(requestedAddressId !== null
			? { addressId: requestedAddressId ?? shippingAddressId }
			: {}),
		addressType: "shipping",
		city: "Round Rock",
		customerId: 42,
		name: recipientName,
		salesId: 77,
		state: "TX",
		zip_code: "78664",
	});

	return { calls, result };
}

describe("sales address assignment", () => {
	it("copies a shared billing address before assigning an edited shipping address", async () => {
		const { calls, result } = await runAssignment({
			billingAddressId: 201,
			shippingAddressId: 201,
			salesReferenceCount: 1,
		});

		expect(calls.addressUpdate).toBe(0);
		expect(calls.addressCreate?.data).toMatchObject({
			address1: "900 Shipping Rd",
			customerId: 42,
			isPrimary: false,
			name: "Shipping Recipient",
		});
		expect(calls.saleUpdate).toEqual({
			where: { id: 77 },
			data: { shippingAddressId: 909 },
		});
		expect(result).toEqual({
			addressId: 909,
			addressType: "shipping",
			billingAddressId: 201,
			customerId: 42,
			salesId: 77,
			shippingAddressId: 909,
		});
	});

	it("copies a distinct address already assigned to the current sale", async () => {
		const { calls, result } = await runAssignment({
			billingAddressId: 201,
			shippingAddressId: 202,
			salesReferenceCount: 1,
		});

		expect(calls.addressCreate?.data.customerId).toBe(42);
		expect(calls.addressUpdate).toBe(0);
		expect(calls.saleUpdate?.data.shippingAddressId).toBe(909);
		expect(result.billingAddressId).toBe(201);
		expect(result.shippingAddressId).toBe(909);
	});

	it("rejects a mismatched sale or dealer-owned customer", async () => {
		await expect(
			runAssignment({
				billingAddressId: 201,
				saleFound: false,
				shippingAddressId: 202,
				salesReferenceCount: 0,
			}),
		).rejects.toMatchObject({ code: "NOT_FOUND" });
		await expect(
			runAssignment({
				billingAddressId: 201,
				dealerOwnerId: 55,
				shippingAddressId: 202,
				salesReferenceCount: 0,
			}),
		).rejects.toMatchObject({ code: "FORBIDDEN" });
	});

	it("rejects address changes for fulfilled sales", async () => {
		await expect(
			runAssignment({
				billingAddressId: 201,
				orderStatus: "Fulfilled",
				shippingAddressId: 202,
				salesReferenceCount: 0,
			}),
		).rejects.toMatchObject({
			code: "CONFLICT",
			message: "Fulfilled sales addresses cannot be edited.",
		});
	});

	it("rejects address changes after delivery fulfillment", async () => {
		await expect(
			runAssignment({
				billingAddressId: 201,
				completedDeliveryItems: 1,
				shippingAddressId: 202,
				salesReferenceCount: 0,
			}),
		).rejects.toMatchObject({ code: "CONFLICT" });
	});

	it("rejects the address-capable customer editor for fulfilled sales", async () => {
		const tx = {
			customers: {
				findUnique: async () => ({ dealerOwnerId: null }),
			},
			salesOrders: {
				findFirst: async () => ({
					billingAddressId: 201,
					deliveries: [],
					id: 77,
					shippingAddressId: 201,
					status: "Fulfilled",
				}),
			},
		};
		const ctx = {
			db: {
				$transaction: async (run: (client: typeof tx) => unknown) => run(tx),
			},
		} as unknown as Parameters<typeof createOrUpdateCustomer>[0];

		await expect(
			createOrUpdateCustomer(ctx, {
				billingAddress: { address1: "100 Billing Ave" },
				customerType: "Personal",
				id: 42,
				name: "Customer",
				profileId: "1",
				salesId: 77,
				salesType: "order",
				shippingSameAsBilling: true,
			}),
		).rejects.toMatchObject({ code: "CONFLICT" });
	});

	it("creates and assigns a shipping address when the sale has none", async () => {
		const { calls, result } = await runAssignment({
			billingAddressId: 201,
			requestedAddressId: null,
			shippingAddressId: null,
			salesReferenceCount: 0,
		});

		expect(calls.addressUpdate).toBe(0);
		expect(calls.addressCreate?.data.address1).toBe("900 Shipping Rd");
		expect(calls.saleUpdate?.data.shippingAddressId).toBe(909);
		expect(result.shippingAddressId).toBe(909);
	});
});

describe("sales address recipient hydration", () => {
	it("hydrates each assigned recipient and falls back only for legacy unnamed rows", async () => {
		const customer = {
			addressBooks: [
				{
					id: 201,
					isPrimary: true,
					name: null,
					address1: "100 Billing Ave",
					meta: {},
				},
				{
					id: 202,
					isPrimary: false,
					name: "Warehouse Recipient",
					address1: "200 Shipping Rd",
					meta: {},
				},
			],
			businessName: null,
			customerTypeId: 1,
			email: null,
			id: 42,
			meta: {},
			name: "Customer Name",
			phoneNo: null,
			profile: { id: 1, title: "Retail" },
			taxProfiles: [],
		};
		const ctx = {
			db: {
				customers: {
					findFirstOrThrow: async () => customer,
				},
			},
		} as unknown as Parameters<typeof getSalesCustomer>[0];

		const result = await getSalesCustomer(ctx, {
			billingId: 201,
			customerId: 42,
			shippingId: 202,
		});

		expect(result.billingAddress?.name).toBe("Customer Name");
		expect(result.shippingAddress?.name).toBe("Warehouse Recipient");
	});
});
