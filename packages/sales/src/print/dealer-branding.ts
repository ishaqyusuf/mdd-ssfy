import type { CompanyAddress } from "./types";

export type DealerBrandingSource = {
	companyName?: string | null;
	name?: string | null;
	phoneNo?: string | null;
	meta?: unknown;
	primaryBillingAddress?: {
		address1?: string | null;
		address2?: string | null;
		city?: string | null;
		state?: string | null;
		country?: string | null;
	} | null;
} | null | undefined;

export type DealerPrintBranding = {
	logoUrl?: string;
	companyAddress: CompanyAddress;
};

export function getDealerLogoUrl(meta: unknown) {
	if (!meta || typeof meta !== "object" || Array.isArray(meta)) {
		return undefined;
	}
	const value = (meta as { logoUrl?: unknown }).logoUrl;
	return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

export function resolveDealerPrintBrandingFromSource(
	dealer: DealerBrandingSource,
): DealerPrintBranding | null {
	if (!dealer) return null;
	const address = dealer.primaryBillingAddress;
	const cityLine = [address?.city, address?.state, address?.country]
		.filter(Boolean)
		.join(", ");

	return {
		logoUrl: getDealerLogoUrl(dealer.meta),
		companyAddress: {
			address1: dealer.companyName || dealer.name || address?.address1 || "",
			address2: [address?.address1, address?.address2, cityLine]
				.filter(Boolean)
				.join(" "),
			phone: dealer.phoneNo || "",
		} satisfies CompanyAddress,
	};
}
