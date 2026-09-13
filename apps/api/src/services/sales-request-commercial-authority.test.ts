import { describe, expect, test } from "bun:test";
import {
	type SalesRequestCommercialAuthorityDatabase,
	resolveSalesRequestCommercialAuthority,
} from "./sales-request-commercial-authority";

const updatedAt = new Date("2026-09-13T12:00:00.000Z");

function rows() {
	return {
		customers: [
			{
				id: 10,
				customerTypeId: 20,
				dealerOwnerId: null,
				updatedAt,
			},
		],
		profiles: [
			{
				id: 20,
				dealerOwnerId: null,
				coefficient: 1.25,
				updatedAt,
			},
		],
		addresses: new Map([
			[
				30,
				[
					{
						id: 30,
						customerId: 10,
						address1: "101 Private Lane",
						address2: null,
						city: "Miami",
						state: "FL",
						country: "US",
						regionId: 3,
						updatedAt,
					},
				],
			],
			[
				31,
				[
					{
						id: 31,
						customerId: 10,
						address1: "202 Confidential Street",
						address2: "Suite 4",
						city: "Miami",
						state: "FL",
						country: "US",
						regionId: 4,
						updatedAt,
					},
				],
			],
		]),
		taxProfiles: [
			{
				id: 40,
				customerId: 10,
				taxCode: "FL",
				updatedAt,
			},
		],
		taxes: [{ taxCode: "FL", percentage: 7.5, updatedAt }],
	};
}

function database(
	data = rows(),
	onRead?: (model: string, args: unknown) => void,
): SalesRequestCommercialAuthorityDatabase {
	return {
		customers: {
			findMany: async (args) => {
				onRead?.("customers", args);
				return data.customers;
			},
		},
		customerTypes: {
			findMany: async (args) => {
				onRead?.("customerTypes", args);
				return data.profiles;
			},
		},
		addressBooks: {
			findMany: async (args) => {
				onRead?.("addressBooks", args);
				return data.addresses.get(args.where.id) || [];
			},
		},
		customerTaxProfiles: {
			findMany: async (args) => {
				onRead?.("customerTaxProfiles", args);
				return data.taxProfiles;
			},
		},
		taxes: {
			findMany: async (args) => {
				onRead?.("taxes", args);
				return data.taxes;
			},
		},
	};
}

const selection = {
	customerId: 10,
	customerProfileId: 20,
	billingAddressId: 30,
	shippingAddressId: 31,
	taxCode: "FL",
};

describe("Sales Request office commercial authority", () => {
	test("resolves exact active authorities without returning contact data", async () => {
		const reads: Array<{ model: string; args: unknown }> = [];
		const result = await resolveSalesRequestCommercialAuthority({
			db: database(rows(), (model, args) => reads.push({ model, args })),
			...selection,
		});

		expect(result).toEqual({
			ok: true,
			issues: [],
			authority: {
				schemaVersion: 1,
				customerId: 10,
				customerProfileId: 20,
				billingAddressId: 30,
				shippingAddressId: 31,
				customerTaxProfileId: 40,
				taxCode: "FL",
				coefficient: 1.25,
				taxPercentage: 7.5,
				revision: expect.stringMatching(/^ca1:[a-f0-9]{64}$/),
			},
		});
		const serialized = JSON.stringify(result);
		expect(serialized).not.toContain("Private Lane");
		expect(serialized).not.toContain("Confidential Street");
		expect(serialized).not.toContain("email");
		expect(serialized).not.toContain("phone");

		expect(reads).toHaveLength(6);
		expect(reads.map(({ model }) => model).sort()).toEqual([
			"addressBooks",
			"addressBooks",
			"customerTaxProfiles",
			"customerTypes",
			"customers",
			"taxes",
		]);
		expect(
			reads.find(({ model }) => model === "customers")?.args,
		).toMatchObject({
			where: { id: 10, dealerOwnerId: null, deletedAt: null },
			take: 2,
		});
		expect(
			reads.find(({ model }) => model === "customerTypes")?.args,
		).toMatchObject({
			where: { id: 20, dealerOwnerId: null, deletedAt: null },
			take: 2,
		});
		expect(
			reads
				.filter(({ model }) => model === "addressBooks")
				.map(({ args }) => args),
		).toEqual(
			expect.arrayContaining([
				expect.objectContaining({
					where: { id: 30, customerId: 10, deletedAt: null },
					take: 2,
				}),
				expect.objectContaining({
					where: { id: 31, customerId: 10, deletedAt: null },
					take: 2,
				}),
			]),
		);
		expect(
			reads.find(({ model }) => model === "customerTaxProfiles")?.args,
		).toMatchObject({
			where: { customerId: 10, taxCode: "FL", deletedAt: null },
			take: 2,
		});
		expect(reads.find(({ model }) => model === "taxes")?.args).toMatchObject({
			where: { taxCode: "FL", deletedAt: null },
			take: 2,
		});
	});

	test("returns a stable revision that changes with authoritative address, coefficient, or tax facts", async () => {
		const firstRows = rows();
		const first = await resolveSalesRequestCommercialAuthority({
			db: database(firstRows),
			...selection,
		});
		const repeat = await resolveSalesRequestCommercialAuthority({
			db: database(firstRows),
			...selection,
		});
		expect(first).toEqual(repeat);
		if (!first.ok) throw new Error("Expected an authority fixture");

		for (const mutate of [
			(data: ReturnType<typeof rows>) => {
				const billing = data.addresses.get(30)?.[0];
				if (billing) billing.city = "Orlando";
			},
			(data: ReturnType<typeof rows>) => {
				const profile = data.profiles[0];
				if (profile) profile.coefficient = 1.5;
			},
			(data: ReturnType<typeof rows>) => {
				const tax = data.taxes[0];
				if (tax) tax.percentage = 8;
			},
		]) {
			const changedRows = rows();
			mutate(changedRows);
			const changed = await resolveSalesRequestCommercialAuthority({
				db: database(changedRows),
				...selection,
			});
			expect(changed.ok).toBe(true);
			if (changed.ok) {
				expect(changed.authority.revision).not.toBe(first.authority.revision);
			}
		}
	});

	test("requires every explicit selection and performs no reads for invalid input", async () => {
		let readCount = 0;
		const result = await resolveSalesRequestCommercialAuthority({
			db: database(rows(), () => {
				readCount += 1;
			}),
			customerId: null,
			customerProfileId: 0,
			billingAddressId: null,
			shippingAddressId: -1,
			taxCode: " FL ",
		});

		expect(result).toEqual({
			ok: false,
			authority: null,
			issues: [
				{ code: "customer-required" },
				{ code: "customer-profile-invalid" },
				{ code: "billing-address-required" },
				{ code: "shipping-address-invalid" },
				{ code: "tax-code-invalid" },
			],
		});
		expect(readCount).toBe(0);
	});

	test("allows an explicit active office profile that differs from the customer default", async () => {
		const data = rows();
		const customer = data.customers[0];
		const profile = data.profiles[0];
		if (!customer || !profile) throw new Error("Expected commercial fixtures");
		customer.customerTypeId = 99;

		const result = await resolveSalesRequestCommercialAuthority({
			db: database(data),
			...selection,
		});

		expect(result.ok).toBe(true);
		if (result.ok) expect(result.authority.customerProfileId).toBe(profile.id);
	});

	test("rejects returned rows that do not exactly match the requested office graph", async () => {
		const data = rows();
		const customer = data.customers[0];
		const profile = data.profiles[0];
		const billing = data.addresses.get(30)?.[0];
		const shipping = data.addresses.get(31)?.[0];
		if (!customer || !profile || !billing || !shipping) {
			throw new Error("Expected commercial fixtures");
		}
		customer.id = 11;
		customer.dealerOwnerId = 2;
		profile.id = 21;
		profile.dealerOwnerId = 3;
		billing.id = 32;
		billing.customerId = 12;
		shipping.id = 33;
		shipping.customerId = 13;

		const result = await resolveSalesRequestCommercialAuthority({
			db: database(data),
			...selection,
		});

		expect(result).toEqual({
			ok: false,
			authority: null,
			issues: [
				{ code: "customer-stale" },
				{ code: "customer-profile-stale" },
				{ code: "billing-address-stale" },
				{ code: "shipping-address-stale" },
			],
		});
	});

	test("returns missing, ambiguous, and malformed commercial facts in policy order", async () => {
		const data = rows();
		data.customers = [];
		const profile = data.profiles[0];
		if (!profile) throw new Error("Expected a profile fixture");
		data.profiles = [profile, { ...profile }];
		const billing = data.addresses.get(30)?.[0];
		if (!billing) throw new Error("Expected an address fixture");
		data.addresses.set(30, [billing, { ...billing }]);
		data.addresses.set(31, []);
		const taxProfile = data.taxProfiles[0];
		if (!taxProfile) throw new Error("Expected a tax profile fixture");
		data.taxProfiles = [taxProfile, { ...taxProfile }];
		const tax = data.taxes[0];
		if (!tax) throw new Error("Expected a tax fixture");
		data.taxes = [{ ...tax, percentage: Number.NaN }];

		const result = await resolveSalesRequestCommercialAuthority({
			db: database(data),
			...selection,
		});

		expect(result).toEqual({
			ok: false,
			authority: null,
			issues: [
				{ code: "customer-not-found" },
				{ code: "customer-profile-ambiguous" },
				{ code: "billing-address-ambiguous" },
				{ code: "shipping-address-not-found" },
				{ code: "customer-tax-profile-ambiguous" },
				{ code: "tax-percentage-invalid" },
			],
		});
	});

	test("rejects case-insensitive database matches that are not the exact selected tax code", async () => {
		const data = rows();
		const taxProfile = data.taxProfiles[0];
		const tax = data.taxes[0];
		if (!taxProfile || !tax) throw new Error("Expected tax fixtures");
		taxProfile.taxCode = "fl";
		tax.taxCode = "fl";

		const result = await resolveSalesRequestCommercialAuthority({
			db: database(data),
			...selection,
		});

		expect(result).toEqual({
			ok: false,
			authority: null,
			issues: [{ code: "customer-tax-profile-stale" }, { code: "tax-stale" }],
		});
	});
});
