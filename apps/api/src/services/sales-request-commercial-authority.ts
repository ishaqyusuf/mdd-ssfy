import { createHash } from "node:crypto";

export const SALES_REQUEST_COMMERCIAL_AUTHORITY_SCHEMA_VERSION = 1 as const;

type RevisionValue = Date | string | null;

type CustomerRow = {
	id: number;
	customerTypeId: number | null;
	dealerOwnerId: number | null;
	updatedAt: RevisionValue;
};

type CustomerProfileRow = {
	id: number;
	dealerOwnerId: number | null;
	coefficient: number | null;
	updatedAt: RevisionValue;
};

type AddressRow = {
	id: number;
	customerId: number | null;
	address1: string | null;
	address2: string | null;
	city: string | null;
	state: string | null;
	country: string | null;
	regionId: number | null;
	updatedAt: RevisionValue;
};

type CustomerTaxProfileRow = {
	id: number;
	customerId: number;
	taxCode: string;
	updatedAt: RevisionValue;
};

type TaxRow = {
	taxCode: string;
	percentage: number;
	updatedAt: RevisionValue;
};

export type SalesRequestCommercialAuthorityDatabase = {
	customers: {
		findMany: (args: {
			where: { id: number; dealerOwnerId: null; deletedAt: null };
			select: {
				id: true;
				customerTypeId: true;
				dealerOwnerId: true;
				updatedAt: true;
			};
			take: 2;
		}) => Promise<CustomerRow[]>;
	};
	customerTypes: {
		findMany: (args: {
			where: { id: number; dealerOwnerId: null; deletedAt: null };
			select: {
				id: true;
				dealerOwnerId: true;
				coefficient: true;
				updatedAt: true;
			};
			take: 2;
		}) => Promise<CustomerProfileRow[]>;
	};
	addressBooks: {
		findMany: (args: {
			where: { id: number; customerId: number; deletedAt: null };
			select: {
				id: true;
				customerId: true;
				address1: true;
				address2: true;
				city: true;
				state: true;
				country: true;
				regionId: true;
				updatedAt: true;
			};
			take: 2;
		}) => Promise<AddressRow[]>;
	};
	customerTaxProfiles: {
		findMany: (args: {
			where: { customerId: number; taxCode: string; deletedAt: null };
			select: {
				id: true;
				customerId: true;
				taxCode: true;
				updatedAt: true;
			};
			take: 2;
		}) => Promise<CustomerTaxProfileRow[]>;
	};
	taxes: {
		findMany: (args: {
			where: { taxCode: string; deletedAt: null };
			select: {
				taxCode: true;
				percentage: true;
				updatedAt: true;
			};
			take: 2;
		}) => Promise<TaxRow[]>;
	};
};

export type SalesRequestCommercialAuthorityInput = {
	db: SalesRequestCommercialAuthorityDatabase;
	customerId?: number | null;
	customerProfileId?: number | null;
	billingAddressId?: number | null;
	shippingAddressId?: number | null;
	taxCode?: string | null;
};

export type SalesRequestCommercialAuthorityIssueCode =
	| "customer-required"
	| "customer-invalid"
	| "customer-not-found"
	| "customer-ambiguous"
	| "customer-stale"
	| "customer-profile-required"
	| "customer-profile-invalid"
	| "customer-profile-not-found"
	| "customer-profile-ambiguous"
	| "customer-profile-stale"
	| "customer-profile-coefficient-invalid"
	| "billing-address-required"
	| "billing-address-invalid"
	| "billing-address-not-found"
	| "billing-address-ambiguous"
	| "billing-address-stale"
	| "shipping-address-required"
	| "shipping-address-invalid"
	| "shipping-address-not-found"
	| "shipping-address-ambiguous"
	| "shipping-address-stale"
	| "tax-code-required"
	| "tax-code-invalid"
	| "customer-tax-profile-not-found"
	| "customer-tax-profile-ambiguous"
	| "customer-tax-profile-stale"
	| "tax-not-found"
	| "tax-ambiguous"
	| "tax-stale"
	| "tax-percentage-invalid";

export type SalesRequestCommercialAuthorityIssue = {
	code: SalesRequestCommercialAuthorityIssueCode;
};

export type SalesRequestCommercialAuthority = {
	schemaVersion: typeof SALES_REQUEST_COMMERCIAL_AUTHORITY_SCHEMA_VERSION;
	customerId: number;
	customerProfileId: number;
	billingAddressId: number;
	shippingAddressId: number;
	customerTaxProfileId: number;
	taxCode: string;
	coefficient: number;
	taxPercentage: number;
	revision: string;
};

export type SalesRequestCommercialAuthorityResult =
	| {
			ok: true;
			issues: [];
			authority: SalesRequestCommercialAuthority;
	  }
	| {
			ok: false;
			issues: SalesRequestCommercialAuthorityIssue[];
			authority: null;
	  };

function positiveInteger(value: unknown): value is number {
	return Number.isSafeInteger(value) && Number(value) > 0;
}

function exactTaxCode(value: unknown): value is string {
	return (
		typeof value === "string" &&
		value.length > 0 &&
		value.length <= 191 &&
		value === value.trim()
	);
}

function canonicalRevisionValue(value: RevisionValue): string | null {
	if (value instanceof Date) return value.toISOString();
	return value;
}

function stableJson(value: unknown): string {
	if (value === null || typeof value !== "object") {
		return JSON.stringify(value) ?? "null";
	}
	if (Array.isArray(value)) return `[${value.map(stableJson).join(",")}]`;
	const record = value as Record<string, unknown>;
	return `{${Object.keys(record)
		.sort()
		.map((key) => `${JSON.stringify(key)}:${stableJson(record[key])}`)
		.join(",")}}`;
}

function revisionFor(value: unknown) {
	const digest = createHash("sha256")
		.update("gnd:sales-request-commercial-authority:v1\0")
		.update(stableJson(value))
		.digest("hex");
	return `ca1:${digest}`;
}

function issue(code: SalesRequestCommercialAuthorityIssueCode) {
	return { code } as const;
}

function exactRowIssue(
	rows: readonly unknown[],
	notFound: SalesRequestCommercialAuthorityIssueCode,
	ambiguous: SalesRequestCommercialAuthorityIssueCode,
) {
	if (rows.length === 0) return issue(notFound);
	if (rows.length !== 1) return issue(ambiguous);
	return null;
}

/**
 * Resolve the exact office-sales customer graph used by low-touch final save.
 *
 * Strict assumptions:
 * - office ownership is represented by `dealerOwnerId: null`;
 * - the selected pricing profile is an explicit active office profile. It may
 *   differ from the customer's assigned default, matching the New Sales Form;
 * - billing and shipping are both explicit selections (including when identical);
 * - tax selection is the exact, case-sensitive `taxCode` on one active customer
 *   tax profile and one active tax row;
 * - coefficient must be finite and positive, and tax percentage must be finite
 *   and within 0..100. No defaults or coercion are applied.
 *
 * Postal address fields are read only to bind the opaque revision. They are not
 * returned, and customer names, email addresses, and phone numbers are never read.
 * The structural DB contract is intentionally compatible with a Prisma
 * transaction client as well as the root client.
 */
export async function resolveSalesRequestCommercialAuthority(
	input: SalesRequestCommercialAuthorityInput,
): Promise<SalesRequestCommercialAuthorityResult> {
	const issues: SalesRequestCommercialAuthorityIssue[] = [];
	const customerId = input.customerId;
	const customerProfileId = input.customerProfileId;
	const billingAddressId = input.billingAddressId;
	const shippingAddressId = input.shippingAddressId;
	const taxCode = input.taxCode;

	if (customerId == null) issues.push(issue("customer-required"));
	else if (!positiveInteger(customerId)) issues.push(issue("customer-invalid"));

	if (customerProfileId == null)
		issues.push(issue("customer-profile-required"));
	else if (!positiveInteger(customerProfileId))
		issues.push(issue("customer-profile-invalid"));

	if (billingAddressId == null) issues.push(issue("billing-address-required"));
	else if (!positiveInteger(billingAddressId))
		issues.push(issue("billing-address-invalid"));

	if (shippingAddressId == null)
		issues.push(issue("shipping-address-required"));
	else if (!positiveInteger(shippingAddressId))
		issues.push(issue("shipping-address-invalid"));

	if (taxCode == null || taxCode === "")
		issues.push(issue("tax-code-required"));
	else if (!exactTaxCode(taxCode)) issues.push(issue("tax-code-invalid"));

	if (issues.length > 0) return { ok: false, issues, authority: null };
	if (
		!positiveInteger(customerId) ||
		!positiveInteger(customerProfileId) ||
		!positiveInteger(billingAddressId) ||
		!positiveInteger(shippingAddressId) ||
		!exactTaxCode(taxCode)
	) {
		return { ok: false, issues: [issue("customer-invalid")], authority: null };
	}

	const [
		customers,
		profiles,
		billingAddresses,
		shippingAddresses,
		taxProfiles,
		taxes,
	] = await Promise.all([
		input.db.customers.findMany({
			where: { id: customerId, dealerOwnerId: null, deletedAt: null },
			select: {
				id: true,
				customerTypeId: true,
				dealerOwnerId: true,
				updatedAt: true,
			},
			take: 2,
		}),
		input.db.customerTypes.findMany({
			where: { id: customerProfileId, dealerOwnerId: null, deletedAt: null },
			select: {
				id: true,
				dealerOwnerId: true,
				coefficient: true,
				updatedAt: true,
			},
			take: 2,
		}),
		input.db.addressBooks.findMany({
			where: {
				id: billingAddressId,
				customerId,
				deletedAt: null,
			},
			select: {
				id: true,
				customerId: true,
				address1: true,
				address2: true,
				city: true,
				state: true,
				country: true,
				regionId: true,
				updatedAt: true,
			},
			take: 2,
		}),
		input.db.addressBooks.findMany({
			where: {
				id: shippingAddressId,
				customerId,
				deletedAt: null,
			},
			select: {
				id: true,
				customerId: true,
				address1: true,
				address2: true,
				city: true,
				state: true,
				country: true,
				regionId: true,
				updatedAt: true,
			},
			take: 2,
		}),
		input.db.customerTaxProfiles.findMany({
			where: { customerId, taxCode, deletedAt: null },
			select: {
				id: true,
				customerId: true,
				taxCode: true,
				updatedAt: true,
			},
			take: 2,
		}),
		input.db.taxes.findMany({
			where: { taxCode, deletedAt: null },
			select: { taxCode: true, percentage: true, updatedAt: true },
			take: 2,
		}),
	]);

	const customerIssue = exactRowIssue(
		customers,
		"customer-not-found",
		"customer-ambiguous",
	);
	if (customerIssue) issues.push(customerIssue);
	if (
		customers.length === 1 &&
		(customers[0]?.id !== customerId || customers[0]?.dealerOwnerId !== null)
	) {
		issues.push(issue("customer-stale"));
	}
	const profileIssue = exactRowIssue(
		profiles,
		"customer-profile-not-found",
		"customer-profile-ambiguous",
	);
	if (profileIssue) issues.push(profileIssue);
	if (
		profiles.length === 1 &&
		(profiles[0]?.id !== customerProfileId ||
			profiles[0]?.dealerOwnerId !== null)
	) {
		issues.push(issue("customer-profile-stale"));
	}
	if (
		profiles.length === 1 &&
		(!Number.isFinite(profiles[0]?.coefficient) ||
			Number(profiles[0]?.coefficient) <= 0)
	) {
		issues.push(issue("customer-profile-coefficient-invalid"));
	}

	const billingIssue = exactRowIssue(
		billingAddresses,
		"billing-address-not-found",
		"billing-address-ambiguous",
	);
	if (billingIssue) issues.push(billingIssue);
	if (
		billingAddresses.length === 1 &&
		(billingAddresses[0]?.id !== billingAddressId ||
			billingAddresses[0]?.customerId !== customerId)
	) {
		issues.push(issue("billing-address-stale"));
	}
	const shippingIssue = exactRowIssue(
		shippingAddresses,
		"shipping-address-not-found",
		"shipping-address-ambiguous",
	);
	if (shippingIssue) issues.push(shippingIssue);
	if (
		shippingAddresses.length === 1 &&
		(shippingAddresses[0]?.id !== shippingAddressId ||
			shippingAddresses[0]?.customerId !== customerId)
	) {
		issues.push(issue("shipping-address-stale"));
	}
	const taxProfileIssue = exactRowIssue(
		taxProfiles,
		"customer-tax-profile-not-found",
		"customer-tax-profile-ambiguous",
	);
	if (taxProfileIssue) issues.push(taxProfileIssue);
	if (
		taxProfiles.length === 1 &&
		(taxProfiles[0]?.customerId !== customerId ||
			taxProfiles[0]?.taxCode !== taxCode)
	) {
		issues.push(issue("customer-tax-profile-stale"));
	}
	const taxIssue = exactRowIssue(taxes, "tax-not-found", "tax-ambiguous");
	if (taxIssue) issues.push(taxIssue);
	if (taxes.length === 1 && taxes[0]?.taxCode !== taxCode) {
		issues.push(issue("tax-stale"));
	}
	if (
		taxes.length === 1 &&
		(!Number.isFinite(taxes[0]?.percentage) ||
			Number(taxes[0]?.percentage) < 0 ||
			Number(taxes[0]?.percentage) > 100)
	) {
		issues.push(issue("tax-percentage-invalid"));
	}

	if (issues.length > 0) return { ok: false, issues, authority: null };

	const customer = customers[0];
	const profile = profiles[0];
	const billingAddress = billingAddresses[0];
	const shippingAddress = shippingAddresses[0];
	const taxProfile = taxProfiles[0];
	const tax = taxes[0];
	if (
		!customer ||
		!profile ||
		!billingAddress ||
		!shippingAddress ||
		!taxProfile ||
		!tax
	) {
		return {
			ok: false,
			issues: [issue("customer-not-found")],
			authority: null,
		};
	}

	const revision = revisionFor({
		schemaVersion: SALES_REQUEST_COMMERCIAL_AUTHORITY_SCHEMA_VERSION,
		customer: {
			id: customer.id,
			customerTypeId: customer.customerTypeId,
			dealerOwnerId: customer.dealerOwnerId,
			updatedAt: canonicalRevisionValue(customer.updatedAt),
		},
		profile: {
			id: profile.id,
			dealerOwnerId: profile.dealerOwnerId,
			coefficient: profile.coefficient,
			updatedAt: canonicalRevisionValue(profile.updatedAt),
		},
		billingAddress: {
			...billingAddress,
			updatedAt: canonicalRevisionValue(billingAddress.updatedAt),
		},
		shippingAddress: {
			...shippingAddress,
			updatedAt: canonicalRevisionValue(shippingAddress.updatedAt),
		},
		taxProfile: {
			...taxProfile,
			updatedAt: canonicalRevisionValue(taxProfile.updatedAt),
		},
		tax: {
			...tax,
			updatedAt: canonicalRevisionValue(tax.updatedAt),
		},
	});

	return {
		ok: true,
		issues: [],
		authority: {
			schemaVersion: SALES_REQUEST_COMMERCIAL_AUTHORITY_SCHEMA_VERSION,
			customerId,
			customerProfileId,
			billingAddressId,
			shippingAddressId,
			customerTaxProfileId: taxProfile.id,
			taxCode,
			coefficient: Number(profile.coefficient),
			taxPercentage: Number(tax.percentage),
			revision,
		},
	};
}
