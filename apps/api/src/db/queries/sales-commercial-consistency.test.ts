import { expect, it } from "bun:test";
import { hasUnprojectedApprovedCommercialSnapshot as differs } from "./sales-commercial-consistency";
const line = (id: number | null, qty = 2) => ({
	id: 50,
	qty,
	lineTotal: 200,
	housePackageTool: {
		doors: [
			{
				id,
				dimension: "3080",
				stepProductId: 12,
				lhQty: 0,
				rhQty: 0,
				totalQty: qty,
				lineTotal: 200,
			},
		],
	},
});
const meta = (lines: unknown[]) => ({
	newSalesForm: { approvedAdjustmentId: "approved", lineItems: lines },
});
it("accepts a previously approved added row whose database ID was assigned later", () => {
	expect(differs(meta([line(null)]), [line(67561)])).toBe(false);
});
it("still blocks changed quantities and wrong existing IDs", () => {
	expect(differs(meta([line(null)]), [line(67561, 3)])).toBe(true);
	expect(differs(meta([line(99)]), [line(67561)])).toBe(true);
});
it("does not match an ambiguous missing identity", () => {
	const canonical = line(67561);
	canonical.housePackageTool.doors.push({
		...canonical.housePackageTool.doors[0]!,
		id: 67562,
	});
	expect(differs(meta([line(null)]), [canonical])).toBe(true);
});

it("reconciles missing shelf IDs but retains price and quantity checks", () => {
	const shelf = (id: number | null, qty = 2) => ({
		id: 50,
		qty: 2,
		lineTotal: 100,
		shelfItems: [
			{
				id,
				categoryId: 3,
				productId: 4,
				description: "Shelf",
				qty,
				totalPrice: 100,
			},
		],
	});
	expect(differs(meta([shelf(null)]), [shelf(20)])).toBe(false);
	expect(differs(meta([shelf(null)]), [shelf(20, 3)])).toBe(true);
});
it("does not cross parent lines or change the snapshot during comparison", () => {
	const proposal = line(null);
	const before = JSON.stringify(proposal);
	expect(differs(meta([proposal]), [{ ...line(67561), id: 51 }])).toBe(true);
	expect(differs(meta([proposal]), [line(67561)])).toBe(false);
	expect(JSON.stringify(proposal)).toBe(before);
});
it("blocks handing, dimension, product and monetary changes", () => {
	for (const change of [
		{ lhQty: 1 },
		{ dimension: "2480" },
		{ stepProductId: 15 },
		{ lineTotal: 190 },
	]) {
		const saved = line(67561);
		Object.assign(saved.housePackageTool.doors[0]!, change);
		expect(differs(meta([line(null)]), [saved])).toBe(true);
	}
});
