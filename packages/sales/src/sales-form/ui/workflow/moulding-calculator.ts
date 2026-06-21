export type MouldingQuantityCalculationInput = {
	linearFeet: number;
	pieceLength: number;
	wastePercentage?: number | null;
	unitPrice?: number | null;
};

export type MouldingQuantityCalculation = {
	basePieces: number;
	adjustedPieces: number;
	adjustedLinearFeet: number;
	pieces: number;
	totalCost: number;
};

const MOULDING_DIMENSION_PATTERN =
	/\d+(?:-\d+\/\d+|\/\d+|\.\d+)?\s*x\s*\d+(?:-\d+\/\d+|\/\d+|\.\d+)?\s*x\s*(\d+(?:\.\d+)?)/i;

export function deriveMouldingPieceLength(
	title?: string | null,
	fallback = 16,
) {
	const match = String(title || "").match(MOULDING_DIMENSION_PATTERN);
	const parsed = Number(match?.[1]);
	if (Number.isFinite(parsed) && parsed > 0) return parsed;
	return normalizePositive(fallback, 16);
}

export function calculateMouldingQuantity(
	input: MouldingQuantityCalculationInput,
): MouldingQuantityCalculation {
	const linearFeet = Math.max(0, finiteNumber(input.linearFeet));
	const pieceLength = normalizePositive(input.pieceLength, 16);
	const wastePercentage = Math.min(
		100,
		Math.max(0, finiteNumber(input.wastePercentage)),
	);
	const unitPrice = Math.max(0, finiteNumber(input.unitPrice));
	const basePieces = linearFeet / pieceLength;
	const adjustedPieces = basePieces * (1 + wastePercentage / 100);
	const pieces = adjustedPieces > 0 ? Math.ceil(adjustedPieces) : 0;

	return {
		basePieces: round(basePieces),
		adjustedPieces: round(adjustedPieces),
		adjustedLinearFeet: round(linearFeet * (1 + wastePercentage / 100)),
		pieces,
		totalCost: round(pieces * unitPrice),
	};
}

function finiteNumber(value: unknown) {
	const parsed = Number(value);
	return Number.isFinite(parsed) ? parsed : 0;
}

function normalizePositive(value: unknown, fallback: number) {
	const parsed = finiteNumber(value);
	return parsed > 0 ? parsed : fallback;
}

function round(value: number) {
	return Number(value.toFixed(2));
}
