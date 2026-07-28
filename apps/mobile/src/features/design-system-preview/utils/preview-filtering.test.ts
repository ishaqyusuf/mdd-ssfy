// @ts-expect-error Expo typecheck does not include Bun test types.
import { describe, expect, it } from "bun:test";
import { fieldRecords, opsRecords, salesRecords } from "../data/sample-data";
import {
	fieldDetailTabs,
	fieldFilterGroups,
	opsDetailTabs,
	opsFilterGroups,
	salesDetailTabs,
	salesFilterGroups,
} from "../data/template-tabs";
import { getPreviewDetailContent } from "./preview-detail-content";
import {
	type PreviewFilterState,
	filterPreviewRecords,
} from "./preview-filtering";

function filters(
	overrides: Partial<PreviewFilterState> = {},
): PreviewFilterState {
	return {
		search: "",
		statuses: new Set(),
		facets: {},
		...overrides,
	};
}

describe("filterPreviewRecords", () => {
	it("limits records to the selected bottom tab", () => {
		expect(
			filterPreviewRecords(fieldRecords, filters(), "Route").map(
				(record) => record.id,
			),
		).toEqual(["RT-08", "RT-11"]);
		expect(
			filterPreviewRecords(opsRecords, filters(), "More").map(
				(record) => record.id,
			),
		).toEqual(["ADM-12", "SYS-04"]);
	});

	it("searches ids, amounts, actions, facets, metadata, and detail copy", () => {
		expect(
			filterPreviewRecords(salesRecords, filters({ search: "6,420" })).map(
				(record) => record.id,
			),
		).toEqual(["PM-842"]);
		expect(
			filterPreviewRecords(fieldRecords, filters({ search: "signature" })).map(
				(record) => record.id,
			),
		).toEqual(["RT-08", "IN-44", "PF-52"]);
		expect(
			filterPreviewRecords(opsRecords, filters({ search: "urgent" })).map(
				(record) => record.id,
			),
		).toEqual(["S-7719", "SO-8812"]);
	});

	it("combines status and template-specific facet filters", () => {
		const result = filterPreviewRecords(
			opsRecords,
			filters({
				statuses: new Set(["blocked"]),
				facets: {
					owner: new Set(["Sales"]),
					window: new Set(["today"]),
				},
			}),
		);

		expect(result.map((record) => record.id)).toEqual(["S-7719"]);
	});

	it("treats selections inside a facet as OR and separate facets as AND", () => {
		const result = filterPreviewRecords(
			salesRecords,
			filters({
				facets: {
					documentType: new Set(["order", "shipment"]),
					paymentState: new Set(["paid"]),
				},
			}),
		);

		expect(result.map((record) => record.id)).toEqual(["SO-4319", "SH-219"]);
	});

	it("offers every fixture facet value in its template filter groups", () => {
		for (const [records, groups] of [
			[opsRecords, opsFilterGroups],
			[fieldRecords, fieldFilterGroups],
			[salesRecords, salesFilterGroups],
		] as const) {
			for (const group of groups) {
				const offered = new Set(group.options.map((option) => option.value));
				const fixtureValues = new Set(
					records
						.map((record) => record.facets[group.key])
						.filter((value): value is string => Boolean(value)),
				);

				for (const value of fixtureValues)
					expect(offered.has(value)).toBe(true);
			}
		}
	});
});

describe("getPreviewDetailContent", () => {
	it("renders substantive content for every Ops detail tab", () => {
		const record = opsRecords.at(0);
		if (!record) throw new Error("Expected an Ops preview fixture.");
		for (const tab of opsDetailTabs) {
			const content = getPreviewDetailContent(record, "ops", tab);
			expect(content.title.length).toBeGreaterThan(3);
			expect(content.rows.length).toBeGreaterThan(0);
		}
	});

	it("renders substantive content for every Field detail tab", () => {
		const record = fieldRecords.at(1);
		if (!record) throw new Error("Expected a Field preview fixture.");
		for (const tab of fieldDetailTabs) {
			const content = getPreviewDetailContent(record, "field", tab);
			expect(content.title.length).toBeGreaterThan(3);
			expect(content.rows.length).toBeGreaterThan(0);
		}
		expect(
			getPreviewDetailContent(record, "field", "Stops").rows[0]?.value,
		).toContain("North Ridge");
	});

	it("keeps payment and fulfillment evidence distinct in Sales detail", () => {
		const record = salesRecords.at(1);
		if (!record) throw new Error("Expected a Sales preview fixture.");
		for (const tab of salesDetailTabs) {
			const content = getPreviewDetailContent(record, "sales", tab);
			expect(content.title.length).toBeGreaterThan(3);
			expect(content.rows.length).toBeGreaterThan(0);
		}
		expect(
			getPreviewDetailContent(record, "sales", "Payments").rows.map(
				(row) => row.value,
			),
		).toContain("Paid");
		expect(
			getPreviewDetailContent(record, "sales", "Fulfillment").rows.map(
				(row) => row.value,
			),
		).toContain("Ready");
	});
});
