const COUNTRY_HEADER_NAMES = ["x-vercel-ip-country", "cf-ipcountry"] as const;

type HeaderReader = {
	get(name: string): string | null;
};

export function getRequestCountryCode(headers?: HeaderReader | null) {
	for (const headerName of COUNTRY_HEADER_NAMES) {
		const countryCode = headers?.get(headerName)?.trim().toUpperCase();

		if (countryCode && countryCode !== "XX" && /^[A-Z]{2}$/.test(countryCode)) {
			return countryCode;
		}
	}

	return null;
}
