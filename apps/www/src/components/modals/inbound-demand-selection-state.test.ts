import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { getPromptMutableDemandIds } from "./inbound-demand-selection-state";

describe("inbound demand selection state", () => {
	test("preselects every mutable demand and excludes protected demand", () => {
		const demandIds = getPromptMutableDemandIds(
			[
				{
					id: 11,
					status: "pending",
					qtyReceived: 0,
					inboundShipmentItemId: null,
				},
				{
					id: 12,
					status: "ordered",
					qtyReceived: 0,
					inboundShipmentItemId: null,
				},
				{
					id: 13,
					status: "ordered",
					qtyReceived: 0,
					inboundShipmentItemId: 31,
				},
				{
					id: 14,
					status: "partially_received",
					qtyReceived: 1,
					inboundShipmentItemId: null,
				},
			],
			"ORDERED",
		);

		expect(demandIds).toEqual([11, 12]);
	});

	test("wires mutable demand ids to the default selection and Mark all control", () => {
		const currentDir = dirname(fileURLToPath(import.meta.url));
		const modalSource = readFileSync(
			resolve(currentDir, "inbound-status-modal.tsx"),
			"utf8",
		);
		const selectionSource = readFileSync(
			resolve(currentDir, "inbound-demand-selection.tsx"),
			"utf8",
		);

		expect(
			modalSource.includes('form.setValue("demandIds", mutableDemandIds'),
		).toBe(true);
		expect(modalSource.includes("onMarkAll={markAllDemands}")).toBe(true);
		expect(selectionSource.includes("Mark all")).toBe(true);
		expect(selectionSource.includes("onClick={onMarkAll}")).toBe(true);
	});
});
