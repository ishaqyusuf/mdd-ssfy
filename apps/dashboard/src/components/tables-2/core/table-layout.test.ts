import { describe, expect, it } from "bun:test";

import {
	getTableColumnLayoutStyle,
	getTableHeaderLayoutStyle,
	resolveTableFillColumnId,
} from "./table-sizes";

describe("responsive table column resolution", () => {
	const columns = [
		{ id: "select", canResize: false },
		{ id: "customer", canResize: true },
		{ id: "address", canResize: true },
		{ id: "actions", canResize: false },
	];

	it("keeps the configured semantic column after reordering", () => {
		expect(
			resolveTableFillColumnId(
				[
					{ id: "select", canResize: false },
					{ id: "address", canResize: true },
					{ id: "customer", canResize: true },
					{ id: "actions", canResize: false },
				],
				"address",
			),
		).toBe("address");
	});

	it("falls back to the last resizable data column when preferred is hidden", () => {
		expect(
			resolveTableFillColumnId(
				columns.filter((column) => column.id !== "address"),
				"address",
			),
		).toBe("customer");
	});

	it("excludes utility columns and falls back to a non-resizable data column", () => {
		expect(
			resolveTableFillColumnId(
				[
					{ id: "selected", canResize: false },
					{ id: "task", canResize: false },
					{ id: "drag-handle", canResize: true },
					{ id: "actions", canResize: true },
				],
				"missing",
			),
		).toBe("task");
	});

	it("returns null when only utility columns remain", () => {
		expect(
			resolveTableFillColumnId(
				[
					{ id: "select", canResize: false },
					{ id: "actions", canResize: false },
				],
				"customer",
			),
		).toBe(null);
	});

	it("resolves a semantic fill column when the table has no Actions column", () => {
		expect(
			resolveTableFillColumnId(
				[
					{ id: "invoice", canResize: true },
					{ id: "description", canResize: true },
					{ id: "status", canResize: true },
				],
				"description",
			),
		).toBe("description");
	});
});

describe("responsive table column styles", () => {
	it("uses saved sizing as the fill column basis and removes only its max cap", () => {
		const style = getTableColumnLayoutStyle({
			size: 280,
			minSize: 180,
			maxSize: 320,
			isFillColumn: true,
		});

		expect(style.width).toBe(280);
		expect(style.minWidth).toBe(180);
		expect(style.maxWidth).toBe(undefined);
		expect(style.flexGrow).toBe(1);
		expect(style.flexBasis).toBe(280);
	});

	it("retains the configured maximum on ordinary columns", () => {
		const style = getTableColumnLayoutStyle({
			size: 160,
			minSize: 130,
			maxSize: 240,
			isFillColumn: false,
		});

		expect(style.width).toBe(160);
		expect(style.minWidth).toBe(130);
		expect(style.maxWidth).toBe(240);
		expect(style.flexGrow).toBe(0);
	});

	it("lets Actions fill only when no data fill column exists", () => {
		const style = getTableColumnLayoutStyle({
			size: 72,
			minSize: 56,
			maxSize: 96,
			isFillColumn: false,
			actionsFullWidth: true,
		});

		expect(style.width).toBe(undefined);
		expect(style.minWidth).toBe(undefined);
		expect(style.maxWidth).toBe(undefined);
		expect(style.flexGrow).toBe(1);
	});

	it("gives header and body the same single growable data column", () => {
		const headers = [
			makeHeader("select", 50, false),
			makeHeader("invoice", 120, true),
			makeHeader("description", 260, true),
			makeHeader("actions", 72, false),
		];
		const bodyFillColumnId = resolveTableFillColumnId(
			headers.map((header) => ({
				id: header.column.id,
				canResize: header.column.getCanResize(),
			})),
			"description",
		);
		const headerLayouts = headers.map((header) =>
			getTableHeaderLayoutStyle({
				headers,
				header,
				isVisible: () => true,
				preferredFillColumnId: "description",
				isSticky: false,
			}),
		);

		expect(bodyFillColumnId).toBe("description");
		expect(
			headerLayouts.filter((layout) => layout.style.flexGrow === 1).length,
		).toBe(1);
		expect(
			headerLayouts.find((layout) => layout.style.flexGrow === 1)
				?.resolvedFillColumnId,
		).toBe(bodyFillColumnId);
	});
});

function makeHeader(id: string, size: number, canResize: boolean) {
	return {
		column: {
			id,
			getSize: () => size,
			getCanResize: () => canResize,
			columnDef: {
				minSize: size,
				maxSize: size,
			},
		},
	};
}
