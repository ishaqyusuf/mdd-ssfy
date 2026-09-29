import { expect, test } from "bun:test";
import { getSalesReconciliationDetails } from "./reconciliation-details";

test("shows handing changes even when parent quantities and prices are identical", () => {
	const line = {
		id: 1,
		uid: "one",
		title: "Door",
		qty: 2,
		lineTotal: 100,
		housePackageTool: {
			doors: [
				{
					id: 2,
					dimension: "2-8",
					lhQty: 1,
					rhQty: 1,
					totalQty: 2,
					lineTotal: 100,
				},
			],
		},
	};
	const changed = structuredClone(line);
	changed.housePackageTool.doors[0]!.lhQty = 2;
	changed.housePackageTool.doors[0]!.rhQty = 0;
	const result = getSalesReconciliationDetails([line], [changed]);
	expect(result).toHaveLength(1);
	expect(result[0]?.before?.handing).toBe("1 LH / 1 RH");
	expect(result[0]?.after?.handing).toBe("2 LH / 0 RH");
});

test("explains additional grouped siblings and the primary row price change", () => {
	const before = [
		{ id: 1, uid: "old", title: "Moulding", qty: 80, lineTotal: 641.9 },
	];
	const after = [
		{
			id: 1,
			uid: "group",
			title: "Moulding",
			qty: 125,
			lineTotal: 1260.2,
			meta: {
				mouldingRows: [
					{ salesItemId: 1, qty: 80, lineTotal: 1090.4 },
					{ salesItemId: 2, qty: 15, lineTotal: 30 },
					{ salesItemId: 3, qty: 30, lineTotal: 139.8 },
				],
			},
		},
	];
	const result = getSalesReconciliationDetails(before, after);
	expect(result).toHaveLength(3);
	expect(result[0]?.before?.total).toBe(641.9);
	expect(result[0]?.after?.total).toBe(1090.4);
	expect(result[1]?.before).toBeNull();
	expect(result[2]?.after?.qty).toBe(30);
});
