import { describe, expect, it } from "bun:test";

import { getItemWorkflowStepFamily } from "./step-family";

describe("item workflow step family", () => {
	it("renders persisted moulding rows on edit reopen from the moulding step", () => {
		const family = getItemWorkflowStepFamily(
			{
				title: "Moulding",
				formSteps: [
					{
						step: {
							title: "Item Type",
						},
						value: "Moulding",
					},
					{
						step: {
							title: "Moulding",
						},
						value: "Casing",
					},
				],
				meta: {
					mouldingRows: [
						{
							uid: "m-1",
							title: "Casing",
							qty: 2,
						},
					],
				},
			} as any,
			{
				step: {
					title: "Moulding",
				},
			} as any,
		);

		expect(family).toBe("moulding-line-item");
	});

	it("renders persisted service rows on edit reopen from the item type step", () => {
		const family = getItemWorkflowStepFamily(
			{
				title: "Services",
				formSteps: [
					{
						step: {
							title: "Item Type",
						},
						value: "Services",
					},
				],
				meta: {
					serviceRows: [
						{
							uid: "svc-1",
							service: "Install",
							qty: 1,
						},
					],
				},
			} as any,
			{
				step: {
					title: "Item Type",
				},
			} as any,
		);

		expect(family).toBe("service-line-item");
	});
});
