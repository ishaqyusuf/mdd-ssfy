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
		zip_code?: string | null;
		country?: string | null;
		meta?: unknown;
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

function getDealerBillingZip(meta: unknown, addressMeta: unknown) {
	for (const source of [addressMeta, meta]) {
		if (!source || typeof source !== "object" || Array.isArray(source)) {
			continue;
		}
		const value = (source as { billingZip?: unknown; zip_code?: unknown });
		const zip = value.billingZip ?? value.zip_code;
		if (typeof zip === "string" && zip.trim()) return zip.trim();
	}
	return undefined;
}

export function resolveDealerPrintBrandingFromSource(
	dealer: DealerBrandingSource,
): DealerPrintBranding | null {
	if (!dealer) return null;
	const address = dealer.primaryBillingAddress;
	const zip = address?.zip_code || getDealerBillingZip(dealer.meta, address?.meta);
	const locality = [address?.city, address?.state].filter(Boolean).join(", ");
	const localityWithZip = [locality, zip]
		.filter(Boolean)
		.join(" ");
	const cityLine = [localityWithZip, address?.country]
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
