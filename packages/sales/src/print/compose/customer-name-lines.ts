type CustomerNameLineInput = {
	businessName?: string | null;
	customerName?: string | null;
	addressName?: string | null;
	uppercase?: boolean;
};

function normalizeName(value?: string | null) {
	return String(value || "").trim();
}

function dedupeKey(value: string) {
	return value.toLowerCase();
}

export function buildCustomerNameLines({
	businessName,
	customerName,
	addressName,
	uppercase = false,
}: CustomerNameLineInput): string[] {
	const lines: string[] = [];
	const seen = new Set<string>();
	const add = (value?: string | null) => {
		const normalized = normalizeName(value);
		if (!normalized) return;
		const key = dedupeKey(normalized);
		if (seen.has(key)) return;
		seen.add(key);
		lines.push(uppercase ? normalized.toUpperCase() : normalized);
	};

	if (businessName) {
		add(businessName);
		add(customerName || addressName);
		add(addressName);
		return lines;
	}

	add(addressName || customerName);
	return lines;
}
