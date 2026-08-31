export type DriverRouteAddress = {
	address1: string;
	address2: string;
	city: string;
	state: string;
	postalCode: string;
	country: string;
	formattedAddress: string;
	lat: number | null;
	lng: number | null;
	placeId: string;
};

export type DriverRouteDestination = {
	primary: DriverRouteAddress;
	route: DriverRouteAddress;
	source: "primary" | "driver_confirmed";
	verified: boolean;
	requiresNormalization: boolean;
	displaySecondary: boolean;
};

type JsonRecord = Record<string, unknown>;

function asRecord(value: unknown): JsonRecord {
	return value && typeof value === "object" && !Array.isArray(value)
		? (value as JsonRecord)
		: {};
}

function text(value: unknown) {
	return String(value || "").trim();
}

function coordinate(value: unknown) {
	const result = Number(value);
	return Number.isFinite(result) ? result : null;
}

function addressFrom(value: unknown): DriverRouteAddress {
	const record = asRecord(value);
	const meta = asRecord(record.meta);
	const city = text(record.city);
	const state = text(record.state || record.region);
	const postalCode = text(
		record.postalCode ||
			record.zipCode ||
			record.zip_code ||
			meta.postalCode ||
			meta.zip_code,
	);
	const country = text(record.country);
	const address1 = text(record.address1);
	const address2 = text(record.address2);
	const formattedAddress =
		text(record.formattedAddress || meta.formattedAddress) ||
		[
			address1,
			address2,
			[city, state, postalCode].filter(Boolean).join(" "),
			country,
		]
			.filter(Boolean)
			.join(", ");

	return {
		address1,
		address2,
		city,
		state,
		postalCode,
		country,
		formattedAddress,
		lat: coordinate(record.lat ?? meta.lat),
		lng: coordinate(record.lng ?? meta.lng),
		placeId: text(record.placeId || meta.placeId),
	};
}

function comparableAddress(value: DriverRouteAddress) {
	return (
		value.formattedAddress ||
		[value.address1, value.city, value.state].join(" ")
	)
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, " ")
		.trim();
}

export function hasRouteCoordinates(value: DriverRouteAddress) {
	return (
		Boolean(value.placeId) &&
		value.lat !== null &&
		value.lng !== null &&
		Boolean(value.formattedAddress || value.address1)
	);
}

export function isDriverAssignmentDestinationReady(input: {
	primaryAddress?: unknown;
	deliveryMode?: string | null;
}) {
	return resolveDriverRouteDestination(input).verified;
}

export function resolveDriverRouteDestination(input: {
	primaryAddress?: unknown;
	deliveryMeta?: unknown;
	deliveryMode?: string | null;
}): DriverRouteDestination {
	const primary = addressFrom(input.primaryAddress);
	const meta = asRecord(input.deliveryMeta);
	const confirmedRecord = asRecord(meta.driverRouteDestination);
	const confirmed = addressFrom(confirmedRecord);
	const hasConfirmed = hasRouteCoordinates(confirmed);
	const route = hasConfirmed ? confirmed : primary;
	const pickup = String(input.deliveryMode || "").toLowerCase() === "pickup";
	const verified = pickup || hasRouteCoordinates(route);

	return {
		primary,
		route,
		source: hasConfirmed ? "driver_confirmed" : "primary",
		verified,
		requiresNormalization: !pickup && !verified,
		displaySecondary:
			hasConfirmed &&
			Boolean(comparableAddress(primary)) &&
			comparableAddress(primary) !== comparableAddress(confirmed),
	};
}

export function createDriverRouteDestination(input: {
	address: DriverRouteAddress;
	confirmedAt: string;
	confirmedById: number;
	primaryAddress?: unknown;
}) {
	const primary = addressFrom(input.primaryAddress);
	const address = addressFrom(input.address);
	return {
		version: 1,
		...address,
		confirmedAt: input.confirmedAt,
		confirmedById: input.confirmedById,
		matchesPrimary:
			Boolean(comparableAddress(primary)) &&
			comparableAddress(primary) === comparableAddress(address),
	};
}

export function formatDriverRouteAddress(value: DriverRouteAddress) {
	return (
		value.formattedAddress ||
		[
			value.address1,
			value.address2,
			[value.city, value.state, value.postalCode].filter(Boolean).join(" "),
			value.country,
		]
			.filter(Boolean)
			.join(", ")
	);
}
