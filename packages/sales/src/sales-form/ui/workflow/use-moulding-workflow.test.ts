import { describe, expect, test } from "bun:test";

import {
	mouldingRowsNeedSync,
	reopenMouldingComponentGrid,
} from "./use-moulding-workflow";

const storedRow = {
	uid: "moulding-1",
	title: "Baseboard",
	description: "Baseboard",
	img: null,
	qty: 3,
	addon: 0,
	customPrice: null,
	salesPrice: 12.5,
	basePrice: 10,
	estimateUnit: 14.5,
	unit: 14.5,
	lineTotal: 43.5,
};

describe("moulding workflow row synchronization", () => {
	test("reopens a saved moulding step as the retained component grid", () => {
		const calls: string[] = [];
		let retainedStep: { lineUid: string; stepIndex: number } | null = null;

		const result = reopenMouldingComponentGrid({
			lineUid: "line-1",
			stepIndex: 1,
			retainStep: (step) => {
				retainedStep = step;
				calls.push("retain");
			},
			activateLine: (lineUid) => calls.push(`line:${lineUid}`),
			activateStep: (lineUid, stepIndex) =>
				calls.push(`step:${lineUid}:${stepIndex}`),
		});

		expect(result).toEqual({ lineUid: "line-1", stepIndex: 1 });
		expect(retainedStep).toEqual(result);
		expect(calls).toEqual(["retain", "line:line-1", "step:line-1:1"]);
	});

	test("settles when persisted and derived rows have the same canonical values", () => {
		expect(
			mouldingRowsNeedSync(
				[{ ...storedRow, legacyMetadata: "ignored" }],
				[{ ...storedRow, transientMetadata: "ignored" }],
			),
		).toBe(false);
	});

	test("does not mark a persisted row dirty when only derived display prices are absent", () => {
		const {
			estimateUnit: _estimateUnit,
			unit: _unit,
			...persistedRow
		} = storedRow;

		expect(mouldingRowsNeedSync([persistedRow], [storedRow])).toBe(false);
	});

	test("requests synchronization when a calculated row value changes", () => {
		expect(
			mouldingRowsNeedSync(
				[storedRow],
				[{ ...storedRow, qty: 4, lineTotal: 58 }],
			),
		).toBe(true);
	});
});
