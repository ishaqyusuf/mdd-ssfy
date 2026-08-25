import { describe, expect, it } from "bun:test";

import {
	getDoorSizeDialogSessionKey,
	updateDoorSizeDialogRowBasePrice,
} from "./door-size-dialog-state";

describe("door size dialog state", () => {
	it("keeps the dialog session stable across parent line and component refreshes", () => {
		const input = {
			open: true,
			lineUid: "line-1",
			componentId: 10,
			componentUid: "door-10",
			supplierUid: null,
			profileCoefficient: 0.7,
		};

		expect(getDoorSizeDialogSessionKey(input)).toBe(
			getDoorSizeDialogSessionKey({ ...input }),
		);
		expect(getDoorSizeDialogSessionKey({ ...input, open: false })).toBeNull();
	});

	it("updates one price without clearing any selected quantities", () => {
		const rows = updateDoorSizeDialogRowBasePrice(
			[
				{
					dimension: "1-6 x 6-8",
					lhQty: 1,
					rhQty: 0,
					totalQty: 1,
					unitPrice: 111.2,
					lineTotal: 111.2,
					meta: { baseUnitPrice: 77.84 },
				},
				{
					dimension: "1-8 x 6-8",
					lhQty: 0,
					rhQty: 1,
					totalQty: 1,
					unitPrice: 164.96,
					lineTotal: 164.96,
					meta: { baseUnitPrice: 115.47 },
				},
			],
			0,
			77.84,
			0.7,
		);

		expect(rows[0]).toMatchObject({ lhQty: 1, totalQty: 1, lineTotal: 111.2 });
		expect(rows[1]).toMatchObject({ rhQty: 1, totalQty: 1, lineTotal: 164.96 });
	});
});
