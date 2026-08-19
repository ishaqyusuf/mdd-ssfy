import { describe, expect, it } from "bun:test";
import { upsertCustomerSchema } from "@api/schemas/customer";
import { createOrUpdateCustomer, searchCustomers } from "./customer";

function createContext() {
	const calls = {
		customerCreate: null as any,
		customerUpdate: null as any,
		addressCreate: [] as any[],
		saleUpdate: null as any,
	};
	const tx = {
		customers: {
			findUnique: async () => null,
			create: async (args: any) => {
				calls.customerCreate = args;
				return { id: 101 };
			},
			update: async (args: any) => {
				calls.customerUpdate = args;
				return { id: args.where.id };
			},
		},
		addressBooks: {
			findFirst: async () => null,
			updateMany: async () => ({ count: 0 }),
			create: async (args: any) => {
				calls.addressCreate.push(args);
				return { id: 201 + calls.addressCreate.length - 1 };
			},
			update: async (args: any) => args.data,
		},
		customerTaxProfiles: {
			update: async () => null,
		},
		salesOrders: {
			findFirst: async () => ({
				id: 77,
				billingAddressId: null,
				shippingAddressId: null,
				status: "pending",
				deliveries: [],
			}),
			update: async (args: any) => {
				calls.saleUpdate = args;
				return { id: 77 };
			},
		},
	};

	return {
		calls,
		ctx: {
			db: {
				$transaction: async (fn: any) => fn(tx),
			},
		} as any,
	};
}

describe("customer business names", () => {
	it("returns enriched, active customer match details without exposing raw metadata", async () => {
		type SearchQueryArgs = {
			where: { AND: unknown[] };
			select: { profile?: unknown; taxProfiles?: unknown };
		};
		let queryArgs: SearchQueryArgs = { where: { AND: [] }, select: {} };
		const customer = {
			id: 44,
			name: "Ada Lovelace",
			businessName: null,
			phoneNo: "555-123-4567",
			phoneNo2: null,
			email: "ada@example.com",
			address: "1 Analytical Way",
			meta: { netTerm: "Net 30" },
			profile: { id: 2, title: "Builder" },
			taxProfiles: [],
			dealerOwnerId: null,
			officeVisibility: "PRIVATE",
			dealerOwner: null,
		};
		const ctx = {
			db: {
				customers: {
					findMany: async (args: SearchQueryArgs) => {
						queryArgs = args;
						return [customer];
					},
				},
			},
		} as unknown as Parameters<typeof searchCustomers>[0];

		const result = await searchCustomers(ctx, { query: "Ada" });

		expect(queryArgs.where.AND).toContainEqual({ deletedAt: null });
		expect(queryArgs.select.profile).toBeDefined();
		expect(queryArgs.select.taxProfiles).toBeDefined();
		expect(result[0]?.id).toBe(44);
		expect(result[0]?.netTerm).toBe("Net 30");
		expect(Object.hasOwn(result[0] ?? {}, "meta")).toBe(false);
	});

	it("returns actionable copy when create hits the unique customer phone guard", async () => {
		const conflict = Object.assign(new Error("Unique constraint failed"), {
			code: "P2002",
			meta: { target: ["phoneNo"] },
		});
		const tx = {
			customers: {
				create: async () => {
					throw conflict;
				},
			},
		};
		const ctx = {
			db: {
				$transaction: async (run: (client: typeof tx) => Promise<unknown>) =>
					run(tx),
			},
		} as unknown as Parameters<typeof createOrUpdateCustomer>[0];

		expect(
			createOrUpdateCustomer(ctx, {
				customerType: "Personal",
				name: "Ada Lovelace",
				phoneNo: "555-123-4567",
				profileId: "1",
			}),
		).rejects.toMatchObject({
			code: "CONFLICT",
			publicMessage:
				"A customer already uses this phone number. Select the matching customer or enter a different number.",
		});
	});

	it("allows a business customer with only a business name", () => {
		const result = upsertCustomerSchema.safeParse({
			customerType: "Business",
			businessName: "Ada Homes",
			profileId: "1",
		});

		expect(result.success).toBe(true);
	});

	it("allows a business customer with business and customer names", () => {
		const result = upsertCustomerSchema.safeParse({
			customerType: "Business",
			businessName: "Ada Homes",
			name: "Ada Lovelace",
			profileId: "1",
		});

		expect(result.success).toBe(true);
	});

	it("requires a business name for business customers", () => {
		const result = upsertCustomerSchema.safeParse({
			customerType: "Business",
			name: "Ada Lovelace",
			profileId: "1",
		});

		expect(result.success).toBe(false);
		if (result.success) throw new Error("Expected validation to fail");
		expect(result.error.issues[0]?.path).toEqual(["businessName"]);
	});

	it("requires a name for personal customers", () => {
		const result = upsertCustomerSchema.safeParse({
			customerType: "Personal",
			profileId: "1",
		});

		expect(result.success).toBe(false);
		if (result.success) throw new Error("Expected validation to fail");
		expect(result.error.issues[0]?.path).toEqual(["name"]);
	});

	it("persists both names for business customers", async () => {
		const { ctx, calls } = createContext();

		await createOrUpdateCustomer(ctx, {
			customerType: "Business",
			businessName: "Ada Homes",
			name: "Ada Lovelace",
			profileId: "1",
			phoneNo: "555-1111",
			existingCustomers: null,
		});

		expect(calls.customerCreate.data.name).toBe("Ada Lovelace");
		expect(calls.customerCreate.data.businessName).toBe("Ada Homes");
	});

	it("creates distinct billing and shipping addresses for a sales customer", async () => {
		const { ctx, calls } = createContext();

		const result = await createOrUpdateCustomer(ctx, {
			billingAddress: {
				address1: "100 Billing Ave",
				city: "Austin",
				state: "TX",
				zip_code: "78701",
			},
			businessName: "Ada Homes",
			customerType: "Business",
			existingCustomers: null,
			name: "Ada Lovelace",
			id: 101,
			profileId: "1",
			salesId: 77,
			salesType: "order",
			shippingAddress: {
				address1: "900 Shipping Rd",
				city: "Round Rock",
				state: "TX",
				zip_code: "78664",
			},
			shippingSameAsBilling: false,
		});

		expect(result).toEqual({
			addressId: 201,
			billingAddressId: 201,
			customerId: 101,
			shippingAddressId: 202,
		});
		expect(calls.addressCreate).toHaveLength(2);
		expect(calls.addressCreate[0].data).toMatchObject({
			address1: "100 Billing Ave",
			customerId: 101,
			isPrimary: true,
		});
		expect(calls.addressCreate[1].data).toMatchObject({
			address1: "900 Shipping Rd",
			customerId: 101,
			isPrimary: false,
		});
		expect(calls.saleUpdate).toEqual({
			where: { id: 77 },
			data: { billingAddressId: 201, shippingAddressId: 202 },
		});
	});

	it("reuses the billing id when shipping is the same", async () => {
		const { ctx, calls } = createContext();

		const result = await createOrUpdateCustomer(ctx, {
			billingAddress: { address1: "100 Billing Ave" },
			businessName: "Ada Homes",
			customerType: "Business",
			existingCustomers: null,
			profileId: "1",
			salesType: "quote",
			shippingSameAsBilling: true,
		});

		expect(calls.addressCreate).toHaveLength(1);
		expect(result.billingAddressId).toBe(201);
		expect(result.shippingAddressId).toBe(201);
	});

	it("allows blank billing and independent shipping street addresses in sales mode", () => {
		const result = upsertCustomerSchema.safeParse({
			businessName: "Ada Homes",
			customerType: "Business",
			profileId: "1",
			salesType: "order",
			shippingSameAsBilling: false,
		});

		expect(result.success).toBe(true);
	});
});
