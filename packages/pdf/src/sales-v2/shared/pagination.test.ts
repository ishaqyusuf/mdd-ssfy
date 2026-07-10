// @ts-expect-error - @gnd/pdf test typecheck does not include Bun ambient types yet.
import { describe, expect, test } from "bun:test";
import type { DoorSection, MouldingSection } from "@gnd/sales/print/types";
import { paginatePrintSections } from "./pagination";

describe("paginatePrintSections", () => {
	test("splits long sections into page-broken chunks that repeat the section lead-in", () => {
		const section: MouldingSection = {
			kind: "moulding",
			index: 1,
			title: "Bifold",
			headers: [
				{ title: "#", key: null, colSpan: 1 },
				{ title: "Door", key: "door", colSpan: 4 },
				{ title: "Qty", key: "qty", colSpan: 1, align: "right" },
			],
			rows: Array.from({ length: 4 }, (_, index) => ({
				cells: [
					{ value: index + 1, colSpan: 1 },
					{ value: `Door ${index + 1}`, colSpan: 4 },
					{ value: 1, colSpan: 1, align: "right" },
				],
			})),
		};

		const chunks = paginatePrintSections([section], {
			showImages: false,
			firstPageHeaderHeight: 80,
			contentHeight: 180,
		});

		expect(chunks).toHaveLength(2);
		expect(chunks[0]?.pageBreakBefore).toBe(false);
		expect(chunks[0]?.section.title).toBe("Bifold");
		expect(chunks[0]?.section.rows).toHaveLength(2);
		expect(chunks[1]?.pageBreakBefore).toBe(true);
		expect(chunks[1]?.continuation).toBe(true);
		expect(chunks[1]?.section.title).toBe("Bifold");
		expect(chunks[1]?.section.headers).toEqual(section.headers);
		expect(chunks[1]?.section.rows).toHaveLength(2);
	});

	test("omits door detail rows from continuation chunks", () => {
		const section: DoorSection = {
			kind: "door",
			index: 2,
			title: "Interior Pre-Hung",
			details: [
				{ label: "Configuration", value: "PH - Single" },
				{ label: "Height", value: "8-0" },
			],
			headers: [
				{ title: "#", key: null, colSpan: 1 },
				{ title: "Door", key: "door", colSpan: 4 },
			],
			rows: Array.from({ length: 4 }, (_, index) => ({
				cells: [
					{ value: index + 1, colSpan: 1 },
					{ value: `Door ${index + 1}`, colSpan: 4 },
				],
			})),
		};

		const chunks = paginatePrintSections([section], {
			showImages: false,
			firstPageHeaderHeight: 80,
			contentHeight: 190,
		});

		expect(chunks.length).toBeGreaterThan(1);
		const firstChunk = chunks[0]?.section;
		const continuationChunk = chunks[1]?.section;

		expect(firstChunk?.kind).toBe("door");
		expect(continuationChunk?.kind).toBe("door");
		if (firstChunk?.kind !== "door" || continuationChunk?.kind !== "door") {
			throw new Error("Expected door chunks");
		}

		expect(firstChunk.details).toHaveLength(2);
		expect(continuationChunk.details).toHaveLength(0);
		expect(continuationChunk.title).toBe("Interior Pre-Hung");
		expect(continuationChunk.headers).toEqual(section.headers);
	});
});
