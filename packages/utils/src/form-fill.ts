export type DevFormFillSeed = {
	id: string;
	label: string;
	numeric: string;
};

function randomString(length: number, charset: string) {
	let value = "";
	for (let index = 0; index < length; index += 1) {
		value += charset[Math.floor(Math.random() * charset.length)] || "";
	}
	return value;
}

function slugPart(value: string) {
	return value
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, "-")
		.replace(/^-+|-+$/g, "");
}

export function createDevFormFillSeed(prefix = "dev"): DevFormFillSeed {
	const time = Date.now().toString(36);
	const random = randomString(
		6,
		"abcdefghijklmnopqrstuvwxyz0123456789",
	).toLowerCase();
	const numeric = randomString(10, "0123456789").slice(-10);
	const label = [slugPart(prefix) || "dev", time, random].join("-");

	return {
		id: `${prefix}-${time}-${random}`,
		label,
		numeric,
	};
}

export function buildDevEmail(seed: DevFormFillSeed, localPart = "user") {
	const local = [slugPart(localPart) || "user", seed.label].join("+");
	return `${local}@example.test`;
}

export function buildDevPhone(seed: DevFormFillSeed) {
	return `555${seed.numeric.slice(-7).padStart(7, "0")}`;
}

export function buildDevAddress(
	seed: DevFormFillSeed,
	lineLabel = "Codex Lane",
) {
	const streetNo = Number(seed.numeric.slice(-4)) || 1001;
	return `${streetNo} ${lineLabel}`;
}
