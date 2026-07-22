// @ts-expect-error packages/sales typecheck does not include Bun test types.
import { describe, expect, it } from "bun:test";

import { getItemWorkflowStepFamily } from "./step-family";

describe("item workflow step family", () => {
	it("shows the moulding catalog before the first grouped row is selected", () => {
		const family = getItemWorkflowStepFamily(
			{
				title: "Mouldings",
				formSteps: [
					{
						step: {
							title: "Item Type",
						},
						value: "Mouldings",
					},
					{
						step: {
							title: "Moulding",
						},
					},
				],
				meta: {
					mouldingRows: [],
				},
			} as any,
			{
				step: {
					title: "Moulding",
				},
			} as any,
		);

		expect(family).toBe("component-grid");
	});

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

	it("keeps grouped moulding panel active from redirected or skipped steps", () => {
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
							title: "Color",
						},
						value: "White",
						meta: {
							redirected: true,
						},
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
					title: "Color",
				},
				meta: {
					redirected: true,
				},
			} as any,
		);

		expect(family).toBe("moulding-line-item");
	});

	it("does not let stale moulding rows force a new non-moulding route into the moulding family", () => {
		const family = getItemWorkflowStepFamily(
			{
				title: "Door",
				formSteps: [
					{
						step: {
							title: "Item Type",
						},
						value: "Door",
					},
					{
						step: {
							title: "Door",
						},
					},
				],
				meta: {
					mouldingRows: [
						{
							uid: "old-moulding",
							title: "Old casing",
							qty: 2,
						},
					],
				},
			} as any,
			{
				step: {
					title: "Door",
				},
			} as any,
		);

		expect(family).toBe("component-grid");
	});

	it("keeps grouped service panel active from service step aliases", () => {
		const family = getItemWorkflowStepFamily(
			{
				title: "Services",
				formSteps: [
					{
						step: {
							title: "Item Type",
						},
						value: "Service",
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
					title: "Services",
				},
			} as any,
		);

		expect(family).toBe("service-line-item");
	});

	it("keeps the shelf editor active from the visible shelf step while item type metadata catches up", () => {
		const family = getItemWorkflowStepFamily(
			{
				title: "Shelf Items",
				formSteps: [
					{
						step: {
							title: "Item Type",
						},
						value: "",
					},
					{
						step: {
							title: "Shelf Items",
						},
					},
				],
				meta: {},
			} as any,
			{
				step: {
					title: "Shelf Items",
				},
			} as any,
		);

		expect(family).toBe("shelf");
	});
});
