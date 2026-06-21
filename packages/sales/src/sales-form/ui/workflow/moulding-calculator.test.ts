// @ts-expect-error packages/sales typecheck does not include Bun test types.
import { describe, expect, it } from "bun:test";

import {
	calculateMouldingQuantity,
	deriveMouldingPieceLength,
} from "./moulding-calculator";

describe("moulding calculator", () => {
	it("derives piece lengths from parenthesized and plain moulding titles", () => {
		expect(
			deriveMouldingPieceLength("FLAT BOARD (5-1/4 X 9/16 X 16) PRIMED"),
		).toBe(16);
		expect(
			deriveMouldingPieceLength("CASING WM316 11/16 X 2-1/4 X 7'"),
		).toBe(7);
		expect(deriveMouldingPieceLength("Moulding without dimensions")).toBe(16);
	});

	it("matches website piece rounding after waste is applied", () => {
		expect(
			calculateMouldingQuantity({
				linearFeet: 100,
				pieceLength: 16,
				wastePercentage: 10,
				unitPrice: 24.5,
			}),
		).toEqual({
			basePieces: 6.25,
			adjustedPieces: 6.88,
			adjustedLinearFeet: 110,
			pieces: 7,
			totalCost: 171.5,
		});
	});

	it("clamps waste to the website-supported zero-to-one-hundred range", () => {
		expect(
			calculateMouldingQuantity({
				linearFeet: 16,
				pieceLength: 8,
				wastePercentage: 140,
			}),
		).toMatchObject({
			adjustedLinearFeet: 32,
			pieces: 4,
		});
	});
});
