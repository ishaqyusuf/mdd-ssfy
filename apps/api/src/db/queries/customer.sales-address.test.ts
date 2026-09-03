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
			findMany: async () => [],
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

	it("allows customer-only edits without touching fulfilled addresses", async () => {
		let saleLookups = 0;
		let addressWrites = 0;
		let customerUpdateData: Record<string, unknown> | undefined;
		const tx = {
			addressBooks: {
				create: async () => {
					addressWrites += 1;
					return { id: 909 };
				},
			},
			customers: {
				findUnique: async () => ({ dealerOwnerId: null }),
				update: async (args: { data: Record<string, unknown> }) => {
					customerUpdateData = args.data;
					return { id: 42 };
				},
			},
			salesOrders: {
				findMany: async () => [],
				findFirst: async () => {
					saleLookups += 1;
					return null;
				},
			},
		};
		const ctx = {
			db: {
				$transaction: async (run: (client: typeof tx) => unknown) => run(tx),
			},
		} as unknown as Parameters<typeof createOrUpdateCustomer>[0];

		const result = await createOrUpdateCustomer(ctx, {
			customerOnly: true,
			customerType: "Personal",
			id: 42,
			name: "Updated Customer",
			profileId: "1",
			salesId: 77,
			salesType: "order",
		});

		expect(result.customerId).toBe(42);
		expect(addressWrites).toBe(0);
		expect(saleLookups).toBe(0);
		expect("address" in (customerUpdateData || {})).toBe(false);
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
	it("uses the primary customer address when sale addresses are not assigned", async () => {
		const customer = {
			address: "Legacy Customer Address",
			addressBooks: [
				{
					address1: "400 Primary Address Blvd",
					id: 201,
					isPrimary: true,
					meta: {},
					name: "Primary Recipient",
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
			billingId: null,
			customerId: 42,
			shippingId: null,
		});

		expect(result.billing.lines).toContain("400 Primary Address Blvd");
		expect(result.shipping.lines).toContain("400 Primary Address Blvd");
		expect(result.billing.lines).not.toContain("Legacy Customer Address");
		expect(result.shipping.lines).not.toContain("same as billing");
	});

	it("falls back to the customer address when sale addresses are not assigned", async () => {
		const customer = {
			address: "300 Customer Ave",
			addressBooks: [],
			businessName: null,
			customerTypeId: 1,
			email: "customer@example.com",
			id: 42,
			meta: {},
			name: "Customer Name",
			phoneNo: "555-0100",
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
			billingId: null,
			customerId: 42,
			shippingId: null,
		});

		expect(result.billing.lines).toContain("300 Customer Ave");
		expect(result.shipping.lines).toContain("300 Customer Ave");
		expect(result.shipping.lines).not.toContain("same as billing");
	});

	it("handles independently missing and explicitly shared sale addresses", async () => {
		const customer = {
			addressBooks: [
				{
					address1: "100 Primary Ave",
					id: 201,
					isPrimary: true,
					meta: {},
					name: "Primary Recipient",
				},
				{
					address1: "200 Explicit Rd",
					id: 202,
					isPrimary: false,
					meta: {},
					name: "Explicit Recipient",
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

		const missingBilling = await getSalesCustomer(ctx, {
			billingId: null,
			customerId: 42,
			shippingId: 202,
		});
		const missingShipping = await getSalesCustomer(ctx, {
			billingId: 202,
			customerId: 42,
			shippingId: null,
		});
		const missingBillingWithPrimaryShipping = await getSalesCustomer(ctx, {
			billingId: null,
			customerId: 42,
			shippingId: 201,
		});
		const explicitlyShared = await getSalesCustomer(ctx, {
			billingId: 201,
			customerId: 42,
			shippingId: 201,
		});

		expect(missingBilling.billing.lines).toContain("100 Primary Ave");
		expect(missingBilling.shipping.lines).toContain("200 Explicit Rd");
		expect(missingShipping.billing.lines).toContain("200 Explicit Rd");
		expect(missingShipping.shipping.lines).toContain("100 Primary Ave");
		expect(missingBillingWithPrimaryShipping.shipping.lines).toContain(
			"100 Primary Ave",
		);
		expect(missingBillingWithPrimaryShipping.shipping.lines).not.toContain(
			"same as billing",
		);
		expect(explicitlyShared.shipping.lines).toEqual(["same as billing"]);
	});

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
