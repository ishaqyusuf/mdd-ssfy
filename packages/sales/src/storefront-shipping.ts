import { roundMoney } from "./payment-system/domain/money";
import { calculateMouldingQuantity } from "./sales-form/ui/workflow/moulding-calculator";
export {
	calculateMouldingQuantity,
	deriveMouldingPieceLength,
} from "./sales-form/ui/workflow/moulding-calculator";

export type StorefrontShippingApprovalMode =
	| "OFFICE_REVIEW"
	| "AUTO_WHEN_CONFIDENT";

export type StorefrontShippingPolicy = {
	enabled: boolean;
	approvalMode: StorefrontShippingApprovalMode;
	baseDispatchFee: number;
	baseVehicleRatePerMile: number;
	roundTripMultiplier: number;
	includedWeightLb: number;
	weightUnitLb: number;
	weightDistanceRate: number;
	packagingMultiplier: number;
	weightRoundingIncrementLb: number;
	minimumCharge: number;
	maximumCharge: number | null;
	maxDistanceMiles: number | null;
	maxWeightLb: number | null;
	freeDeliveryThreshold: number | null;
	autoApprovalMaxDistanceMiles: number | null;
	autoApprovalMaxWeightLb: number | null;
	autoApprovalMaxAmount: number | null;
	allowGlobalFallbackForAutoApproval: boolean;
};

type WeightSource =
	| "OVERRIDE"
	| "PROFILE"
	| "CATEGORY_DEFAULT"
	| "GLOBAL_DEFAULT"
	| "UNMAPPED";

type ShippingLineBase = {
	key: string;
	description: string;
};

export type StorefrontDoorShippingLine = ShippingLineBase & {
	kind: "DOOR";
	quantity: number;
	dimension?: string | null;
	weights: {
		overrideWeightLb?: number | null;
		profileWeightLb?: number | null;
		globalDefaultWeightLb?: number | null;
	};
	handlingFeePerUnit?: number | null;
};

export type StorefrontMouldingShippingLine = ShippingLineBase & {
	kind: "MOULDING";
	requestedLinearFeet: number;
	pieceLengthFeet: number;
	wastePercentage?: number | null;
	unitPrice?: number | null;
	weights: {
		overrideLbPerLinearFoot?: number | null;
		categoryLbPerLinearFoot?: number | null;
		globalDefaultLbPerLinearFoot?: number | null;
	};
	handlingFeePerUnit?: number | null;
};

export type StorefrontShelfShippingLine = ShippingLineBase & {
	kind: "SHELF";
	quantity: number;
	weights: {
		overrideWeightPerUnitLb?: number | null;
		childCategoryWeightPerUnitLb?: number | null;
		parentCategoryWeightPerUnitLb?: number | null;
		globalDefaultWeightPerUnitLb?: number | null;
	};
	handlingFeePerUnit?: number | null;
};

export type StorefrontShippingLine =
	| StorefrontDoorShippingLine
	| StorefrontMouldingShippingLine
	| StorefrontShelfShippingLine;

export type StorefrontShippingBlocker =
	| "CALCULATION_DISABLED"
	| "ROUTE_UNAVAILABLE"
	| "OUTSIDE_SERVICE_AREA"
	| "UNMAPPED_WEIGHT"
	| "WEIGHT_CAPACITY_EXCEEDED";

export type StorefrontShippingAutoApprovalBlocker =
	| "AUTO_GATES_NOT_CONFIGURED"
	| "GLOBAL_FALLBACK_NOT_ALLOWED"
	| "AUTO_DISTANCE_LIMIT_EXCEEDED"
	| "AUTO_WEIGHT_LIMIT_EXCEEDED"
	| "AUTO_AMOUNT_LIMIT_EXCEEDED";

export type StorefrontShippingDecision =
	| "PENDING_OFFICE_REVIEW"
	| "AUTO_APPROVED"
	| "MANUAL_REVIEW_REQUIRED";

export type StorefrontShippingQuoteLine = {
	kind: StorefrontShippingLine["kind"];
	key: string;
	description: string;
	source: WeightSource;
	weightLb: number;
	handlingSurcharge: number;
	quantity?: number;
	dimension?: string | null;
	weightPerUnitLb?: number;
	requestedLinearFeet?: number;
	pieceLengthFeet?: number;
	pieces?: number;
	shippedLinearFeet?: number;
	weightPerLinearFootLb?: number;
	productPrice?: number;
};

export type StorefrontShippingQuote = {
	amount: number;
	decision: StorefrontShippingDecision;
	blockers: StorefrontShippingBlocker[];
	autoApprovalBlockers: StorefrontShippingAutoApprovalBlocker[];
	lines: StorefrontShippingQuoteLine[];
	breakdown: {
		oneWayDistanceMiles: number | null;
		routeMiles: number;
		estimatedWeightLb: number;
		chargeableWeightLb: number;
		excessWeightLb: number;
		excessWeightUnits: number;
		baseDispatchFee: number;
		distanceCharge: number;
		weightDistanceCharge: number;
		handlingSurcharges: number;
		preClampAmount: number;
		freeDeliveryApplied: boolean;
	};
};

export function buildStorefrontShippingQuote(input: {
	oneWayDistanceMiles: number | null;
	subtotal: number;
	policy: StorefrontShippingPolicy;
	lines: StorefrontShippingLine[];
}): StorefrontShippingQuote {
	const { policy } = input;
	const blockers: StorefrontShippingBlocker[] = [];
	const autoApprovalBlockers: StorefrontShippingAutoApprovalBlocker[] = [];
	const lines = input.lines.map(resolveShippingLine);

	if (!policy.enabled) blockers.push("CALCULATION_DISABLED");

	const oneWayDistanceMiles = nullableNonNegative(input.oneWayDistanceMiles);
	if (oneWayDistanceMiles === null) {
		blockers.push("ROUTE_UNAVAILABLE");
	}
	if (
		oneWayDistanceMiles !== null &&
		isPositive(policy.maxDistanceMiles) &&
		oneWayDistanceMiles > Number(policy.maxDistanceMiles)
	) {
		blockers.push("OUTSIDE_SERVICE_AREA");
	}
	if (lines.some((line) => line.source === "UNMAPPED")) {
		blockers.push("UNMAPPED_WEIGHT");
	}

	const estimatedWeightLb = round(
		lines.reduce((total, line) => total + line.weightLb, 0),
	);
	const chargeableWeightLb = roundUpToIncrement(
		estimatedWeightLb * positiveOr(policy.packagingMultiplier, 1),
		positiveOr(policy.weightRoundingIncrementLb, 1),
	);
	if (
		isPositive(policy.maxWeightLb) &&
		chargeableWeightLb > Number(policy.maxWeightLb)
	) {
		blockers.push("WEIGHT_CAPACITY_EXCEEDED");
	}

	const routeMiles = round(
		(oneWayDistanceMiles ?? 0) *
			Math.max(0, finite(policy.roundTripMultiplier)),
	);
	const includedWeightLb = Math.max(0, finite(policy.includedWeightLb));
	const excessWeightLb = round(
		Math.max(0, chargeableWeightLb - includedWeightLb),
	);
	const weightUnitLb = positiveOr(policy.weightUnitLb, 1);
	const excessWeightUnits = round(excessWeightLb / weightUnitLb);
	const baseDispatchFee = money(Math.max(0, finite(policy.baseDispatchFee)));
	const distanceCharge = money(
		routeMiles * Math.max(0, finite(policy.baseVehicleRatePerMile)),
	);
	const weightDistanceCharge = money(
		routeMiles *
			excessWeightUnits *
			Math.max(0, finite(policy.weightDistanceRate)),
	);
	const handlingSurcharges = money(
		lines.reduce((total, line) => total + line.handlingSurcharge, 0),
	);
	const preClampAmount = money(
		baseDispatchFee +
			distanceCharge +
			weightDistanceCharge +
			handlingSurcharges,
	);
	const eligible = blockers.length === 0;
	const freeDeliveryApplied =
		eligible &&
		isNonNegative(policy.freeDeliveryThreshold) &&
		Math.max(0, finite(input.subtotal)) >= Number(policy.freeDeliveryThreshold);
	const amount = freeDeliveryApplied
		? 0
		: clampMoney(
				preClampAmount,
				Math.max(0, finite(policy.minimumCharge)),
				policy.maximumCharge,
			);

	if (
		policy.approvalMode === "AUTO_WHEN_CONFIDENT" &&
		(!isPositive(policy.autoApprovalMaxDistanceMiles) ||
			!isPositive(policy.autoApprovalMaxWeightLb) ||
			!isNonNegative(policy.autoApprovalMaxAmount))
	) {
		autoApprovalBlockers.push("AUTO_GATES_NOT_CONFIGURED");
	}
	if (
		!policy.allowGlobalFallbackForAutoApproval &&
		lines.some((line) => line.source === "GLOBAL_DEFAULT")
	) {
		autoApprovalBlockers.push("GLOBAL_FALLBACK_NOT_ALLOWED");
	}
	if (
		oneWayDistanceMiles !== null &&
		isPositive(policy.autoApprovalMaxDistanceMiles) &&
		oneWayDistanceMiles > Number(policy.autoApprovalMaxDistanceMiles)
	) {
		autoApprovalBlockers.push("AUTO_DISTANCE_LIMIT_EXCEEDED");
	}
	if (
		isPositive(policy.autoApprovalMaxWeightLb) &&
		chargeableWeightLb > Number(policy.autoApprovalMaxWeightLb)
	) {
		autoApprovalBlockers.push("AUTO_WEIGHT_LIMIT_EXCEEDED");
	}
	if (
		isNonNegative(policy.autoApprovalMaxAmount) &&
		amount > Number(policy.autoApprovalMaxAmount)
	) {
		autoApprovalBlockers.push("AUTO_AMOUNT_LIMIT_EXCEEDED");
	}

	let decision: StorefrontShippingDecision = "PENDING_OFFICE_REVIEW";
	if (blockers.length > 0) {
		decision = "MANUAL_REVIEW_REQUIRED";
	} else if (
		policy.approvalMode === "AUTO_WHEN_CONFIDENT" &&
		autoApprovalBlockers.length === 0
	) {
		decision = "AUTO_APPROVED";
	}

	return {
		amount,
		decision,
		blockers,
		autoApprovalBlockers,
		lines,
		breakdown: {
			oneWayDistanceMiles,
			routeMiles,
			estimatedWeightLb,
			chargeableWeightLb,
			excessWeightLb,
			excessWeightUnits,
			baseDispatchFee,
			distanceCharge,
			weightDistanceCharge,
			handlingSurcharges,
			preClampAmount,
			freeDeliveryApplied,
		},
	};
}

function resolveShippingLine(
	line: StorefrontShippingLine,
): StorefrontShippingQuoteLine {
	if (line.kind === "DOOR") {
		const quantity = Math.max(0, finite(line.quantity));
		const resolved = resolveWeight([
			["OVERRIDE", line.weights.overrideWeightLb],
			["PROFILE", line.weights.profileWeightLb],
			["GLOBAL_DEFAULT", line.weights.globalDefaultWeightLb],
		]);
		return {
			kind: line.kind,
			key: line.key,
			description: line.description,
			source: resolved.source,
			quantity,
			dimension: line.dimension,
			weightPerUnitLb: resolved.value,
			weightLb: round(quantity * resolved.value),
			handlingSurcharge: money(
				quantity * Math.max(0, finite(line.handlingFeePerUnit)),
			),
		};
	}

	if (line.kind === "MOULDING") {
		const calculation = calculateMouldingQuantity({
			linearFeet: line.requestedLinearFeet,
			pieceLength: line.pieceLengthFeet,
			wastePercentage: line.wastePercentage,
			unitPrice: line.unitPrice,
		});
		const shippedLinearFeet = round(
			calculation.pieces * positiveOr(line.pieceLengthFeet, 16),
		);
		const resolved = resolveWeight([
			["OVERRIDE", line.weights.overrideLbPerLinearFoot],
			["CATEGORY_DEFAULT", line.weights.categoryLbPerLinearFoot],
			["GLOBAL_DEFAULT", line.weights.globalDefaultLbPerLinearFoot],
		]);
		return {
			kind: line.kind,
			key: line.key,
			description: line.description,
			source: resolved.source,
			requestedLinearFeet: Math.max(0, finite(line.requestedLinearFeet)),
			pieceLengthFeet: positiveOr(line.pieceLengthFeet, 16),
			pieces: calculation.pieces,
			shippedLinearFeet,
			weightPerLinearFootLb: resolved.value,
			weightLb: round(shippedLinearFeet * resolved.value),
			productPrice: calculation.totalCost,
			handlingSurcharge: money(
				calculation.pieces * Math.max(0, finite(line.handlingFeePerUnit)),
			),
		};
	}

	const quantity = Math.max(0, finite(line.quantity));
	const resolved = resolveWeight([
		["OVERRIDE", line.weights.overrideWeightPerUnitLb],
		["CATEGORY_DEFAULT", line.weights.childCategoryWeightPerUnitLb],
		["CATEGORY_DEFAULT", line.weights.parentCategoryWeightPerUnitLb],
		["GLOBAL_DEFAULT", line.weights.globalDefaultWeightPerUnitLb],
	]);
	return {
		kind: line.kind,
		key: line.key,
		description: line.description,
		source: resolved.source,
		quantity,
		weightPerUnitLb: resolved.value,
		weightLb: round(quantity * resolved.value),
		handlingSurcharge: money(
			quantity * Math.max(0, finite(line.handlingFeePerUnit)),
		),
	};
}

function resolveWeight(
	candidates: Array<
		[Exclude<WeightSource, "UNMAPPED">, number | null | undefined]
	>,
) {
	for (const [source, value] of candidates) {
		if (isPositive(value)) return { source, value: Number(value) };
	}
	return { source: "UNMAPPED" as const, value: 0 };
}

function clampMoney(value: number, minimum: number, maximum: number | null) {
	const max =
		isNonNegative(maximum) && Number(maximum) >= minimum
			? Number(maximum)
			: Number.POSITIVE_INFINITY;
	return money(Math.min(max, Math.max(minimum, value)));
}

function roundUpToIncrement(value: number, increment: number) {
	if (value <= 0) return 0;
	return round(Math.ceil(value / increment) * increment);
}

function nullableNonNegative(value: unknown) {
	if (value === null || value === undefined || value === "") return null;
	const parsed = Number(value);
	return Number.isFinite(parsed) && parsed >= 0 ? parsed : null;
}

function isPositive(value: unknown) {
	return Number.isFinite(Number(value)) && Number(value) > 0;
}

function isNonNegative(value: unknown) {
	return (
		value !== null &&
		value !== undefined &&
		Number.isFinite(Number(value)) &&
		Number(value) >= 0
	);
}

function positiveOr(value: unknown, fallback: number) {
	return isPositive(value) ? Number(value) : fallback;
}

function finite(value: unknown) {
	const parsed = Number(value);
	return Number.isFinite(parsed) ? parsed : 0;
}

function money(value: number) {
	return roundMoney(value);
}

function round(value: number) {
	return Math.round((value + Number.EPSILON) * 10_000) / 10_000;
}
