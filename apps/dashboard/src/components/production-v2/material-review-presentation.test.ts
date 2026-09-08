import { describe, expect, test } from "bun:test";
import { selectMaterialReview } from "./material-review-presentation";

describe("material review selection", () => {
	test("opens the current order review without an extra selection click", () => {
		expect(
			selectMaterialReview({
				orderContext: true,
				selectedId: null,
				requestedId: null,
				reviewIds: [395],
			}),
		).toBe(395);
	});
	test("preserves an explicit history link and a valid user selection", () => {
		expect(
			selectMaterialReview({
				orderContext: true,
				selectedId: 395,
				requestedId: 12,
				reviewIds: [395],
			}),
		).toBe(12);
		expect(
			selectMaterialReview({
				orderContext: true,
				selectedId: 396,
				requestedId: null,
				reviewIds: [395, 396],
			}),
		).toBe(396);
	});
	test("moves to remaining review after approval and clears an empty queue", () => {
		expect(
			selectMaterialReview({
				orderContext: true,
				selectedId: 395,
				requestedId: null,
				reviewIds: [396],
			}),
		).toBe(396);
		expect(
			selectMaterialReview({
				orderContext: true,
				selectedId: 395,
				requestedId: null,
				reviewIds: [],
			}),
		).toBe(null);
	});
	test("standalone queue waits for explicit selection", () => {
		expect(
			selectMaterialReview({
				orderContext: false,
				selectedId: null,
				requestedId: null,
				reviewIds: [395],
			}),
		).toBe(null);
	});
});
