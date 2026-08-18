/** @jsxImportSource react */
import type {
	CellHeader,
	PrintSection,
	RowCell,
	SectionDetail,
} from "@gnd/sales/print/types";
import {
	Item,
	ItemActions,
	ItemContent,
	ItemGroup,
	ItemHeader,
	ItemMedia,
	ItemTitle,
} from "@gnd/ui/item";
import { resolveImageSrc } from "./utils";

const MOBILE_PRIMARY_KEYS = new Set([
	"description",
	"door",
	"moulding",
	"item",
]);

export const RESPONSIVE_SECTION_STYLES = `
.sales-html-mobile-item-group {
	display: none !important;
}

@media (max-width: 639px) {
	.sales-html-section-table {
		display: none !important;
	}

	.sales-html-mobile-item-group {
		display: flex !important;
	}
}

@media print {
	.sales-html-section-table {
		display: block !important;
	}

	.sales-html-mobile-item-group {
		display: none !important;
	}
}
`;

export function MobileSectionItems({
	section,
	baseUrl,
	showImages,
	uppercaseText,
}: {
	section: PrintSection;
	baseUrl?: string;
	showImages: boolean;
	uppercaseText: boolean;
}) {
	return (
		<ItemGroup
			className="sales-html-mobile-item-group gap-2 p-3"
			aria-label={`${section.title || "Invoice"} items`}
		>
			{section.rows.map((row, rowIndex) => (
				<MobileSectionItem
					key={`${section.kind}-${section.index}-item-${rowIndex}`}
					headers={section.headers}
					row={row}
					rowIndex={rowIndex}
					baseUrl={baseUrl}
					showImages={showImages}
					uppercaseText={uppercaseText}
				/>
			))}
		</ItemGroup>
	);
}

function MobileSectionItem({
	headers,
	row,
	rowIndex,
	baseUrl,
	showImages,
	uppercaseText,
}: {
	headers: CellHeader[];
	row: {
		cells: RowCell[];
		componentDetails?: SectionDetail[];
	};
	rowIndex: number;
	baseUrl?: string;
	showImages: boolean;
	uppercaseText: boolean;
}) {
	const keyedPrimaryIndex = headers.findIndex((header) =>
		MOBILE_PRIMARY_KEYS.has(header.key || ""),
	);
	const imageIndex = row.cells.findIndex((cell) => Boolean(cell.image));
	const primaryIndex =
		keyedPrimaryIndex >= 0
			? keyedPrimaryIndex
			: imageIndex >= 0
				? imageIndex
				: Math.min(1, row.cells.length - 1);
	const totalIndex = headers.findIndex((header) =>
		String(header.key || "").toLowerCase().includes("total"),
	);
	const sequenceValue = row.cells[0]?.value;
	const primaryCell = row.cells[primaryIndex];
	const totalCell = totalIndex >= 0 ? row.cells[totalIndex] : null;
	const facts = headers.flatMap((header, index) => {
		const cell = row.cells[index];
		if (
			!cell ||
			index === 0 ||
			index === primaryIndex ||
			index === totalIndex ||
			!hasDisplayValue(cell.value)
		) {
			return [];
		}

		return [{ label: header.title, value: cell.value }];
	});
	const componentDetails = row.componentDetails || [];
	const imageSrc =
		showImages && primaryCell?.image
			? resolveImageSrc(primaryCell.image, baseUrl)
			: null;

	return (
		<Item
			variant="outline"
			size="sm"
			role="listitem"
			className="items-start gap-3 bg-white p-3"
		>
			{imageSrc ? (
				<ItemMedia variant="image" className="size-12 border">
					<img src={imageSrc} alt="" />
				</ItemMedia>
			) : null}
			<ItemContent className="min-w-0 gap-2">
				<ItemHeader className="items-start">
					<ItemTitle className="min-w-0 flex-1 text-xs font-semibold leading-snug">
						{hasDisplayValue(sequenceValue) ? (
							<span className="shrink-0 text-muted-foreground">
								#{formatSectionText(sequenceValue ?? null, uppercaseText)}
							</span>
						) : null}
						<span>
							{formatSectionText(
								primaryCell?.value ?? `Item ${rowIndex + 1}`,
								uppercaseText,
							)}
						</span>
					</ItemTitle>
					{totalCell && hasDisplayValue(totalCell.value) ? (
						<ItemActions className="shrink-0 text-xs font-semibold">
							{formatSectionText(totalCell.value, uppercaseText)}
						</ItemActions>
					) : null}
				</ItemHeader>
				{facts.length || componentDetails.length ? (
					<dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-xs">
						{facts.map((fact, index) => (
							<div key={`${fact.label}-${index}`} className="min-w-0">
								<dt className="text-[10px] uppercase tracking-wide text-muted-foreground">
									{formatSectionText(fact.label, uppercaseText)}
								</dt>
								<dd className="mt-0.5 break-words font-medium text-foreground">
									{formatSectionText(fact.value, uppercaseText)}
								</dd>
							</div>
						))}
						{componentDetails.map((detail, index) => (
							<div
								key={`${detail.label}-${index}`}
								className="min-w-0"
							>
								<dt className="text-[10px] uppercase tracking-wide text-muted-foreground">
									{formatSectionText(detail.label, uppercaseText)}
								</dt>
								<dd className="mt-0.5 break-words font-medium text-foreground">
									{formatSectionText(detail.value, uppercaseText)}
								</dd>
							</div>
						))}
					</dl>
				) : null}
			</ItemContent>
		</Item>
	);
}

function hasDisplayValue(value: unknown) {
	return value !== null && value !== undefined && String(value).trim() !== "";
}

function formatSectionText(value: string | number | null, uppercase: boolean) {
	if (value == null) return "";
	const text = String(value);
	return uppercase ? text.toUpperCase() : text;
}
