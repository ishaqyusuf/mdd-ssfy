export type CustomerMatchInput = {
	name?: string | null;
	businessName?: string | null;
	email?: string | null;
	phoneNo?: string | null;
	customerType?: "Personal" | "Business" | null;
};

export type CustomerMatchCandidate = {
	id: number;
	name?: string | null;
	businessName?: string | null;
	email?: string | null;
	phoneNo?: string | null;
};

function normalizeText(value?: string | null) {
	return value?.trim().toLocaleLowerCase() ?? "";
}

export function normalizeCustomerPhone(value?: string | null) {
	return value?.replace(/\D/g, "") ?? "";
}

export function buildCustomerMatchQuery(input: CustomerMatchInput) {
	const phone = normalizeCustomerPhone(input.phoneNo);
	if (phone.length >= 4) return input.phoneNo?.trim() || phone;

	const email = normalizeText(input.email);
	if (email.length >= 4) return email;

	const businessName = normalizeText(input.businessName);
	if (input.customerType === "Business" && businessName.length >= 3) {
		return input.businessName?.trim() || businessName;
	}

	const name = normalizeText(input.name);
	if (name.length >= 3) return input.name?.trim() || name;

	return null;
}

export function getCustomerMatchSignals(
	input: CustomerMatchInput,
	candidate: CustomerMatchCandidate,
) {
	const signals: Array<"phone" | "email" | "businessName" | "name"> = [];
	const phone = normalizeCustomerPhone(input.phoneNo);
	if (
		phone.length === 10 &&
		phone === normalizeCustomerPhone(candidate.phoneNo)
	) {
		signals.push("phone");
	}

	const email = normalizeText(input.email);
	if (email && email === normalizeText(candidate.email)) signals.push("email");

	const businessName = normalizeText(input.businessName);
	if (
		businessName &&
		businessName === normalizeText(candidate.businessName)
	) {
		signals.push("businessName");
	}

	const name = normalizeText(input.name);
	if (name && name === normalizeText(candidate.name)) signals.push("name");

	return signals;
}

export function findBlockingCustomerMatches(
	input: CustomerMatchInput,
	candidates: CustomerMatchCandidate[],
) {
	return candidates.filter((candidate) =>
		getCustomerMatchSignals(input, candidate).includes("phone"),
	);
}
