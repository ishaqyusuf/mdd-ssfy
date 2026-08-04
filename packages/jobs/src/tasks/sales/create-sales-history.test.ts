import { describe, expect, it } from "bun:test";
import { runCreateSalesHistory } from "./create-sales-history";

describe("runCreateSalesHistory", () => {
	it("preserves the copy failure instead of replacing it with a missing-slug error", async () => {
		const copyError =
			"Unique constraint failed on the fields: (`orderId`,`type`)";

		await expect(
			runCreateSalesHistory(
				{
					author: { id: 7, name: "Pablo Cruz" },
					salesNo: "00010PC",
					salesType: "order",
				},
				{
					copySales: async () => ({ error: copyError }),
					createNoteAction: async () => undefined as never,
					db: {} as never,
				},
			),
		).rejects.toThrow(copyError);
	});
});
