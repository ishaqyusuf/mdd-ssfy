import { describe, expect, it } from "bun:test";

import { salesProductionSubmitted } from "../src/types/sales-production-submitted";
import { salesProductionUnassigned } from "../src/types/sales-production-unassigned";

const author = { id: 1, profileId: 1, name: "Sales rep" };
const recipient = { id: 2, profileId: 54, name: "Carlos" };

describe("production lifecycle notifications", () => {
	it("tells the worker which assignment was removed", () => {
		const activity = salesProductionUnassigned.createActivity(
			{
				salesId: 26595,
				orderNo: "09480AD",
				assignmentId: 14290,
				assignedToId: 54,
			},
			author,
			recipient,
		);
		expect(activity.type).toBe("sales_production_unassigned");
		expect(activity.headline).toContain("09480AD");
		expect(activity.headline).toContain("unassigned");
	});

	it("tells the sales rep who submitted production work", () => {
		const activity = salesProductionSubmitted.createActivity(
			{
				salesId: 26595,
				orderNo: "09480AD",
				salesRepId: 16,
				submittedById: 54,
				submittedByName: "Carlos",
				submittedQty: 2,
			},
			author,
			recipient,
		);
		expect(activity.type).toBe("sales_production_submitted");
		expect(activity.headline).toContain("Carlos");
		expect(activity.headline).toContain("09480AD");
	});
});
