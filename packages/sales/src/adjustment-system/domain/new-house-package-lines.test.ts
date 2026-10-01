import { describe, expect, it } from "bun:test";
import { getApprovedNewHousePackageLines } from "./new-house-package-lines";

function fixture() {
	const existing: Record<string, unknown> = {
		id: 177207,
		uid: "existing",
		qty: 2,
	};
	const added = {
		id: null as number | null,
		uid: "new-bifold",
		title: "BIFOLD CUT",
		qty: 1,
		unitPrice: 217.5,
		lineTotal: 217.5,
		taxxable: true,
		formSteps: [
			{ id: null as number | null, stepId: 1, componentId: 4, value: "Bifold" },
		],
		housePackageTool: {
			id: null as number | null,
			doorType: "Bifold",
			totalDoors: 1,
			totalPrice: 217.5,
			doors: [
				{
					id: null as number | null,
					dimension: "3-0 x 8-0",
					totalQty: 1,
					lineTotal: 217.5,
					stepProductId: 12,
				},
			],
		},
	};
	return {
		beforeLines: [{ id: 177207, uid: "existing", qty: 1 }],
		proposedLines: [existing, added] as Record<string, unknown>[],
		existing,
		added,
	};
}

describe("approved new configured door eligibility", () => {
	it("accepts the existing quantity increase and identity-free new bifold", () => {
		const f = fixture();
		const added = getApprovedNewHousePackageLines(f);
		expect(added).toHaveLength(1);
		expect(added[0]?.original).toBe(f.added);
		expect(added[0]?.line.lineTotal).toBe(217.5);
	});
	it("rejects a lost existing identity and a foreign claimed item", () => {
		const f = fixture();
		f.existing.id = null;
		expect(() => getApprovedNewHousePackageLines(f)).toThrow(
			"existing approved sale line",
		);
		f.existing.id = 9999;
		expect(() => getApprovedNewHousePackageLines(f)).toThrow(
			"foreign persisted identity",
		);
	});
	it("rejects duplicate or missing UIDs before returning new rows", () => {
		const f = fixture();
		f.proposedLines.push(structuredClone(f.added));
		expect(() => getApprovedNewHousePackageLines(f)).toThrow(
			"unique stable identities",
		);
		f.proposedLines.pop();
		f.added.uid = "";
		expect(() => getApprovedNewHousePackageLines(f)).toThrow(
			"unique stable identities",
		);
	});
	it("rejects reuse of one owned item for two proposed lines", () => {
		const f = fixture();
		f.proposedLines.push({ ...f.existing, uid: "another-line" });
		expect(() => getApprovedNewHousePackageLines(f)).toThrow(
			"share a persisted identity",
		);
	});
	it("rejects duplicate or missing workflow selections", () => {
		const f = fixture();
		const step = f.added.formSteps[0];
		if (!step) throw new Error("Missing test step");
		f.added.formSteps.push({ ...step });
		expect(() => getApprovedNewHousePackageLines(f)).toThrow(
			"distinct valid workflow steps",
		);
		f.added.formSteps = [];
		expect(() => getApprovedNewHousePackageLines(f)).toThrow(
			"configured door item",
		);
	});
	for (const child of ["hpt", "door", "step"] as const) {
		it(`rejects persisted ${child} identity on a purported new line`, () => {
			const f = fixture();
			const line = f.added;
			if (child === "hpt") line.housePackageTool.id = 10;
			if (child === "door") line.housePackageTool.doors[0].id = 10;
			if (child === "step") line.formSteps[0].id = 10;
			expect(() => getApprovedNewHousePackageLines(f)).toThrow(
				"persisted child identities",
			);
		});
	}
	it("retains the restriction for new unsupported line shapes", () => {
		const f = fixture();
		f.proposedLines = [f.existing, { ...f.added, housePackageTool: null }];
		expect(() => getApprovedNewHousePackageLines(f)).toThrow(
			"configured door item",
		);
	});
	it("rejects duplicated configuration and quantity/total drift", () => {
		const f = fixture();
		const line = f.added;
		line.housePackageTool.doors.push(
			structuredClone(line.housePackageTool.doors[0]),
		);
		expect(() => getApprovedNewHousePackageLines(f)).toThrow(
			"distinct configured door rows",
		);
		line.housePackageTool.doors.pop();
		line.qty = 2;
		expect(() => getApprovedNewHousePackageLines(f)).toThrow(
			"quantities and total",
		);
		line.qty = 1;
		line.lineTotal = 300;
		expect(() => getApprovedNewHousePackageLines(f)).toThrow(
			"quantities and total",
		);
	});
});
