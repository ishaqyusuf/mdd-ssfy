import type {
	DoorRow,
	DoorSection,
	LineItemRow,
	LineItemSection,
	MouldingRow,
	MouldingSection,
	PrintSection,
	RowCell,
	ServiceRow,
	ServiceSection,
	ShelfRow,
	ShelfSection,
} from "@gnd/sales/print/types";
import {
	DEFAULT_SALES_PAGE_BREAK_MODE,
	type SalesPageBreakMode,
} from "./page-break-mode";

const NORMAL_SECTION_LEAD_IN_PRESENCE_AHEAD = 48;
const IMAGE_SECTION_LEAD_IN_PRESENCE_AHEAD = 64;
const LETTER_CONTENT_HEIGHT = 752;
const SECTION_GAP_HEIGHT = 6;
const SECTION_TITLE_HEIGHT = 24;
const SECTION_DETAIL_ROW_HEIGHT = 20;
const SECTION_TABLE_HEADER_HEIGHT = 26;
const NORMAL_ROW_HEIGHT = 22;
const IMAGE_ROW_HEIGHT = 58;
const COMPONENT_DETAIL_ROW_HEIGHT = 9;

type SectionLeadInOptions = {
	detailRowCount?: number;
	hasTableHeader?: boolean;
	hasFirstRow?: boolean;
};

export function getSectionLeadInPresenceAhead(
	hasImageColumn = false,
	options: SectionLeadInOptions = {},
) {
	const minimum = hasImageColumn
		? IMAGE_SECTION_LEAD_IN_PRESENCE_AHEAD
		: NORMAL_SECTION_LEAD_IN_PRESENCE_AHEAD;
	const estimated =
		24 +
		(options.detailRowCount ?? 0) * 20 +
		(options.hasTableHeader ? 28 : 0) +
		(options.hasFirstRow ? (hasImageColumn ? 64 : 36) : 0) +
		16;

	return Math.max(minimum, estimated);
}

export type PaginatedPrintSection = {
	key: string;
	section: PrintSection;
	sourceIndex: number;
	chunkIndex: number;
	pageBreakBefore: boolean;
	continuation: boolean;
};

type SectionPaginationOptions = {
	showImages: boolean;
	firstPageHeaderHeight: number;
	pageBreakMode?: SalesPageBreakMode;
	contentHeight?: number;
	sectionGapHeight?: number;
};

type PrintRow = DoorRow | MouldingRow | ServiceRow | ShelfRow | LineItemRow;

export function paginatePrintSections(
	sections: PrintSection[],
	options: SectionPaginationOptions,
): PaginatedPrintSection[] {
	const contentHeight = options.contentHeight ?? LETTER_CONTENT_HEIGHT;
	const sectionGapHeight = options.sectionGapHeight ?? SECTION_GAP_HEIGHT;
	const pageBreakMode = options.pageBreakMode ?? DEFAULT_SALES_PAGE_BREAK_MODE;
	const output: PaginatedPrintSection[] = [];
	let remaining = Math.max(0, contentHeight - options.firstPageHeaderHeight);
	let hasRenderedSection = false;
	let forceBreakForNextChunk = false;

	sections.forEach((section, sourceIndex) => {
		const hasImageColumn = sectionHasImageColumn(section, options.showImages);
		const rows = section.rows as PrintRow[];
		const wholeSectionHeight =
			sectionGapHeight +
			estimateLeadInHeight(section, false, pageBreakMode) +
			rows.reduce<number>(
				(total, row) => total + estimateRowHeight(section, row, hasImageColumn),
				0,
			);

		if (rows.length === 0) {
			const gapHeight = hasRenderedSection ? sectionGapHeight : 0;
			const sectionHeight =
				gapHeight + estimateLeadInHeight(section, false, pageBreakMode);
			const pageBreakBefore =
				hasRenderedSection &&
				sectionHeight > remaining &&
				remaining < contentHeight;
			if (pageBreakBefore) remaining = contentHeight;
			const consumedSectionHeight =
				(pageBreakBefore ? 0 : gapHeight) +
				estimateLeadInHeight(section, false, pageBreakMode);

			output.push({
				key: `${section.kind}-${section.index}-0`,
				section,
				sourceIndex,
				chunkIndex: 0,
				pageBreakBefore,
				continuation: false,
			});
			remaining = Math.max(0, remaining - consumedSectionHeight);
			hasRenderedSection = true;
			forceBreakForNextChunk = false;
			return;
		}

		let rowIndex = 0;
		let chunkIndex = 0;

		while (rowIndex < rows.length) {
			const firstRow = rows[rowIndex];
			if (!firstRow) break;

			const continuation = chunkIndex > 0;
			const gapHeight =
				hasRenderedSection && !forceBreakForNextChunk ? sectionGapHeight : 0;
			const leadInHeight = estimateLeadInHeight(
				section,
				continuation,
				pageBreakMode,
			);
			const firstRowHeight = estimateRowHeight(
				section,
				firstRow,
				hasImageColumn,
			);
			const firstRowRequirement = gapHeight + leadInHeight + firstRowHeight;
			const sectionCanFitOnFreshPage = wholeSectionHeight <= contentHeight;
			let pageBreakBefore =
				forceBreakForNextChunk ||
				(pageBreakMode === "section" &&
					chunkIndex === 0 &&
					hasRenderedSection &&
					sectionCanFitOnFreshPage &&
					wholeSectionHeight > remaining &&
					remaining < contentHeight) ||
				(firstRowRequirement > remaining && remaining < contentHeight);

			if (pageBreakBefore) {
				remaining = contentHeight;
			}

			const usableGapHeight = pageBreakBefore ? 0 : gapHeight;
			const availableForRows = Math.max(
				0,
				remaining - usableGapHeight - leadInHeight,
			);
			let consumedRowsHeight = 0;
			let nextRowIndex = rowIndex;

			while (nextRowIndex < rows.length) {
				const row = rows[nextRowIndex];
				if (!row) break;

				const rowHeight = estimateRowHeight(section, row, hasImageColumn);
				if (
					nextRowIndex > rowIndex &&
					consumedRowsHeight + rowHeight > availableForRows
				) {
					break;
				}

				consumedRowsHeight += rowHeight;
				nextRowIndex += 1;

				if (consumedRowsHeight >= availableForRows) break;
			}

			if (nextRowIndex === rowIndex) {
				consumedRowsHeight = firstRowHeight;
				nextRowIndex = rowIndex + 1;
				if (!pageBreakBefore && firstRowRequirement > remaining) {
					pageBreakBefore = true;
					remaining = contentHeight;
				}
			}

			const rowsForChunk = rows.slice(rowIndex, nextRowIndex);
			output.push({
				key: `${section.kind}-${section.index}-${chunkIndex}`,
				section: cloneSectionWithRows(
					section,
					rowsForChunk,
					continuation,
					pageBreakMode,
				),
				sourceIndex,
				chunkIndex,
				pageBreakBefore,
				continuation,
			});

			remaining = Math.max(
				0,
				remaining -
					(pageBreakBefore ? 0 : usableGapHeight) -
					leadInHeight -
					consumedRowsHeight,
			);
			hasRenderedSection = true;
			rowIndex = nextRowIndex;
			chunkIndex += 1;
			forceBreakForNextChunk = rowIndex < rows.length;
		}

		forceBreakForNextChunk = false;
	});

	return output;
}

export function getPaginatedSectionPresenceAhead(section: PrintSection) {
	return getSectionLeadInPresenceAhead(sectionHasImageColumn(section, true), {
		detailRowCount:
			section.kind === "door" ? getDoorDetailRowCount(section) : 0,
		hasTableHeader: section.rows.length > 0,
		hasFirstRow: section.rows.length > 0,
	});
}

function estimateLeadInHeight(
	section: PrintSection,
	continuation: boolean,
	pageBreakMode: SalesPageBreakMode,
) {
	const detailRowCount =
		(!continuation || pageBreakMode === "fullHeader") && section.kind === "door"
			? getDoorDetailRowCount(section)
			: 0;

	return (
		SECTION_TITLE_HEIGHT +
		detailRowCount * SECTION_DETAIL_ROW_HEIGHT +
		(section.rows.length > 0 ? SECTION_TABLE_HEADER_HEIGHT : 0)
	);
}

function estimateRowHeight(
	section: PrintSection,
	row: PrintRow,
	hasImageColumn: boolean,
) {
	if (hasImageColumn && row.cells.some((cell) => cell.image)) {
		return IMAGE_ROW_HEIGHT;
	}

	if (section.kind === "line-item") {
		const componentDetails = (row as LineItemRow).componentDetails ?? [];
		return (
			NORMAL_ROW_HEIGHT + componentDetails.length * COMPONENT_DETAIL_ROW_HEIGHT
		);
	}

	return NORMAL_ROW_HEIGHT;
}

function sectionHasImageColumn(section: PrintSection, showImages: boolean) {
	return (
		showImages &&
		section.rows.some((row) =>
			row.cells.some((cell: RowCell) => Boolean(cell.image)),
		)
	);
}

function getDoorDetailRowCount(section: DoorSection) {
	const visibleDetails = section.details.filter((detail) => {
		const label = String(detail.label || "").trim();
		const value = String(detail.value || "").trim();
		return Boolean(label && value);
	});

	return Math.ceil(visibleDetails.length / 2);
}

function cloneSectionWithRows(
	section: PrintSection,
	rows: PrintRow[],
	continuation: boolean,
	pageBreakMode: SalesPageBreakMode,
): PrintSection {
	switch (section.kind) {
		case "door":
			return {
				...section,
				details:
					continuation && pageBreakMode !== "fullHeader" ? [] : section.details,
				rows: rows as DoorRow[],
			} satisfies DoorSection;
		case "moulding":
			return {
				...section,
				rows: rows as MouldingRow[],
			} satisfies MouldingSection;
		case "service":
			return {
				...section,
				rows: rows as ServiceRow[],
			} satisfies ServiceSection;
		case "shelf":
			return {
				...section,
				rows: rows as ShelfRow[],
			} satisfies ShelfSection;
		case "line-item":
			return {
				...section,
				rows: rows as LineItemRow[],
			} satisfies LineItemSection;
	}
}
