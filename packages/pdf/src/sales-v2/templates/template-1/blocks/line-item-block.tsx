/** @jsxImportSource react */
import { Image, Text, View } from "@react-pdf/renderer";
import { cn } from "../../../../utils/tw";
import type {
	CellHeader,
	LineItemSection,
	RowCell,
} from "@gnd/sales/print/types";
import { hexToRgba, colorsObject } from "@gnd/utils/colors";
import { resolveImageSrc } from "../../../shared/utils";

interface LineItemBlockProps {
	section: LineItemSection;
	baseUrl?: string;
	showImages: boolean;
}

const BORDER_COLOR = "#9ca3af";
const COLUMN_WIDTHS: Record<string, number> = {
	rowNumber: 6,
	image: 10,
	swing: 11,
	qty: 7,
	packing: 12,
	rate: 9,
	total: 10,
};

export function LineItemBlock({
	section,
	baseUrl,
	showImages,
}: LineItemBlockProps) {
	const hasImageColumn =
		showImages &&
		section.rows.some((row) => row.cells.some((cell) => cell.image));
	const widths = getColumnWidths(section.headers, hasImageColumn);

	return (
		<View
			style={{
				...cn(`flex-col border-x border-t text-sm`),
				borderColor: BORDER_COLOR,
			}}
		>
			{section.title ? (
				<Text
					wrap={false}
					style={{
						...cn(`text-sm p-1 uppercase text-left bg-slate-100`),
						fontWeight: 700,
						letterSpacing: 0.3,
					}}
				>
					{section.title}
				</Text>
			) : null}

			<View style={cn(`flex-col`)}>
				<View style={{ ...cn(`flex-row border-t`), borderColor: BORDER_COLOR }}>
					{buildHeaderColumns(section.headers, hasImageColumn).map(
						(h, index, headers) => (
							<View
								key={`${h.key}-${index}`}
								style={{
									...cn(
										`border-b uppercase ${index === headers.length - 1 ? "" : "border-r"}`,
									),
									borderColor: BORDER_COLOR,
									paddingHorizontal: 4,
									paddingVertical: 2,
									width: widths[h.key],
									justifyContent: "center",
									backgroundColor: hexToRgba(colorsObject.black, 0.2),
								}}
							>
								<Text
									style={cn(
										`font-semibold ${h.align === "right" ? "text-right" : h.align === "center" ? "text-center" : ""}`,
									)}
								>
									{h.title}
								</Text>
							</View>
						),
					)}
				</View>

				{section.rows.map((row, ri) => {
					const imageSrc = resolveImageSrc(
						row.cells.find((cell) => cell.image)?.image,
						baseUrl,
					);
					const visualCells = buildRowColumns(
						section.headers,
						row.cells,
						hasImageColumn,
					);

					return (
						<View
							wrap={false}
							key={ri}
							style={{
								...cn(
									`flex-row border-b font-medium text-xs ${row.isGroupHeader ? "bg-slate-200" : ""}`,
								),
								borderColor: BORDER_COLOR,
							}}
						>
							{visualCells.map((cell, ci) => {
								const isDescription = cell.key === "description";
								const componentDetails =
									isDescription && !row.isGroupHeader
										? row.componentDetails || []
										: [];

								return (
									<View
										key={`${cell.key}-${ci}`}
										style={{
											...cn(
												`${ci === visualCells.length - 1 ? "" : "border-r"}`,
											),
											borderColor: BORDER_COLOR,
											width: widths[cell.key],
											justifyContent: "center",
										}}
									>
										{cell.key === "image" && imageSrc ? (
											<Image
												src={imageSrc}
												style={{
													width: 34,
													height: 34,
													objectFit: "contain",
													marginHorizontal: "auto",
												}}
											/>
										) : (
											<View
												style={{ paddingHorizontal: 4, paddingVertical: 3 }}
											>
												<Text
													style={{
														...cn(
															`${cell.bold ? "font-bold" : ""} ${row.isGroupHeader && isDescription ? "text-center uppercase" : cell.align === "right" ? "text-right" : cell.align === "center" ? "text-center" : "text-left"}`,
														),
														fontWeight:
															row.isGroupHeader && isDescription
																? 700
																: undefined,
													}}
												>
													{cell.value ?? ""}
												</Text>
												{componentDetails.length > 0 ? (
													<View style={{ marginTop: 2 }}>
														{componentDetails.map((detail, detailIndex) => (
															<Text
																key={`${detail.label}-${detailIndex}`}
																style={{
																	fontSize: 7,
																	lineHeight: 1.25,
																	color: "#475569",
																}}
															>
																{`${detail.label}: ${detail.value}`}
															</Text>
														))}
													</View>
												) : null}
											</View>
										)}
									</View>
								);
							})}
						</View>
					);
				})}
			</View>
		</View>
	);
}

function buildHeaderColumns(headers: CellHeader[], hasImageColumn: boolean) {
	const columns: { key: string; title: string; align?: CellHeader["align"] }[] =
		[];

	headers.forEach((header, index) => {
		columns.push({
			key: headerKey(header, index),
			title: header.title,
			align: header.align,
		});

		if (index === 0 && hasImageColumn) {
			columns.push({ key: "image", title: "Image", align: "center" });
		}
	});

	return columns;
}

function buildRowColumns(
	headers: CellHeader[],
	cells: RowCell[],
	hasImageColumn: boolean,
) {
	const columns: Array<RowCell & { key: string }> = [];

	cells.forEach((cell, index) => {
		columns.push({
			...cell,
			key: headerKey(headers[index]!, index),
		});

		if (index === 0 && hasImageColumn) {
			columns.push({
				key: "image",
				value: null,
				colSpan: 1,
				align: "center",
			});
		}
	});

	return columns;
}

function getColumnWidths(headers: CellHeader[], hasImageColumn: boolean) {
	const keys = headers.map((header, index) => headerKey(header, index));
	const fixedUsed = keys.reduce(
		(sum, key) => sum + (COLUMN_WIDTHS[key] ?? 0),
		0,
	);
	const flexibleKeys = keys.filter((key) => !(key in COLUMN_WIDTHS));
	const remaining = Math.max(
		0,
		100 - fixedUsed - (hasImageColumn ? (COLUMN_WIDTHS.image ?? 0) : 0),
	);
	const flexibleWidth =
		flexibleKeys.length > 0 ? `${remaining / flexibleKeys.length}%` : "0%";

	return keys.reduce<Record<string, string>>(
		(acc, key) => {
			acc[key] =
				key in COLUMN_WIDTHS ? `${COLUMN_WIDTHS[key]}%` : flexibleWidth;
			return acc;
		},
		hasImageColumn ? { image: `${COLUMN_WIDTHS.image ?? 0}%` } : {},
	);
}

function headerKey(header: CellHeader, index: number) {
	if (index === 0) return "rowNumber";
	return header.key ?? `col-${index}`;
}
