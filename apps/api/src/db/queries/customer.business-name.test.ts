import { describe, expect, it } from "bun:test";
import { upsertCustomerSchema } from "@api/schemas/customer";
import { createOrUpdateCustomer } from "./customer";

function createContext() {
	const calls = {
		customerCreate: null as any,
		customerUpdate: null as any,
		addressCreate: null as any,
	};
	const tx = {
		customers: {
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
			create: async (args: any) => {
				calls.addressCreate = args;
				return { id: 201 };
			},
			update: async (args: any) => args.data,
		},
		customerTaxProfiles: {
			update: async () => null,
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
});
