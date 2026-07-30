import type { SalesFormPreferenceMode } from "@gnd/sales/sales-form";

export const SALES_FORM_PREFERENCE_COOKIE = "gnd-sales-form-preference";
export const SALES_FORM_PREFERENCE_COOKIE_VERSION = 1;
export const SALES_FORM_PREFERENCE_COOKIE_MAX_AGE = 60 * 60 * 24 * 90;

type SalesFormPreferenceCookie = {
	version: typeof SALES_FORM_PREFERENCE_COOKIE_VERSION;
	userId: number;
	mode: SalesFormPreferenceMode;
	updatedAt: string;
};

export function serializeSalesFormPreferenceCookie(input: {
	userId: number;
	mode: SalesFormPreferenceMode;
	updatedAt?: Date;
}) {
	return JSON.stringify({
		version: SALES_FORM_PREFERENCE_COOKIE_VERSION,
		userId: input.userId,
		mode: input.mode,
		updatedAt: (input.updatedAt ?? new Date()).toISOString(),
	} satisfies SalesFormPreferenceCookie);
}

export function parseSalesFormPreferenceCookie(
	value: string | null | undefined,
	userId: number,
): SalesFormPreferenceCookie | null {
	if (!value) return null;
	try {
		const parsed = JSON.parse(value) as Partial<SalesFormPreferenceCookie>;
		if (
			parsed.version !== SALES_FORM_PREFERENCE_COOKIE_VERSION ||
			parsed.userId !== userId ||
			(parsed.mode !== "new" && parsed.mode !== "legacy") ||
			typeof parsed.updatedAt !== "string"
		) {
			return null;
		}
		return parsed as SalesFormPreferenceCookie;
	} catch {
		return null;
	}
}
