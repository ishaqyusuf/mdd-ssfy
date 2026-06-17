/** @jsxImportSource react */
import { Image, Text, View } from "@react-pdf/renderer";
import type {
	CellHeader,
	LineItemSection,
	RowCell,
} from "@gnd/sales/print/types";
import { resolveImageSrc } from "../../../shared/utils";

// ─── Design tokens ─────────────────────────────────────────
const NAVY = "#1a2e4a";
const ACCENT = "#2563eb";
const BORDER = "#d1dae8";
const ROW_ALT = "#f8fafc";

const COLUMN_WIDTHS: Record<string, number> = {
	rowNumber: 6,
	image: 10,
	swing: 11,
	qty: 7,
	packing: 12,
	rate: 9,
	total: 10,
};

interface LineItemBlockProps {
	section: LineItemSection;
	baseUrl?: string;
	showImages: boolean;
}

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
				flexDirection: "column",
				borderRadius: 4,
				overflow: "hidden",
				borderWidth: 1,
				borderColor: BORDER,
				marginBottom: 2,
			}}
		>
			{section.title ? (
				<View
					style={{
						backgroundColor: NAVY,
						paddingVertical: 4,
						paddingHorizontal: 8,
					}}
				>
					<Text
						wrap={false}
						style={{
							fontSize: 8.5,
							fontWeight: 700,
							color: "#ffffff",
							textTransform: "uppercase",
							letterSpacing: 0.4,
						}}
					>
						{section.title}
					</Text>
				</View>
			) : null}

			<View style={{ flexDirection: "column" }}>
				<View
					style={{
						flexDirection: "row",
						backgroundColor: "#e2e8f0",
						borderBottomWidth: 1,
						borderBottomColor: BORDER,
					}}
				>
					{buildHeaderColumns(section.headers, hasImageColumn).map(
						(h, index, headers) => (
							<View
								key={`${h.key}-${index}`}
								style={{
									width: widths[h.key],
									paddingVertical: 4,
									paddingHorizontal: 5,
									borderRightWidth: index < headers.length - 1 ? 1 : 0,
									borderRightColor: BORDER,
									justifyContent: "center",
								}}
							>
								<Text
									style={{
										fontSize: 7.5,
										fontWeight: 700,
										color: "#334155",
										textTransform: "uppercase",
										textAlign:
											h.align === "right"
												? "right"
												: h.align === "center"
													? "center"
													: "left",
									}}
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
								flexDirection: "row",
								backgroundColor: row.isGroupHeader
									? "#dbeafe"
									: ri % 2 === 0
										? "#ffffff"
										: ROW_ALT,
								borderBottomWidth: ri < section.rows.length - 1 ? 1 : 0,
								borderBottomColor: BORDER,
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
											width: widths[cell.key],
											paddingVertical: 3,
											paddingHorizontal: cell.key === "image" ? 2 : 5,
											borderRightWidth: ci < visualCells.length - 1 ? 1 : 0,
											borderRightColor: BORDER,
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
											<>
												<Text
													style={{
														fontSize: 8.5,
														fontWeight:
															cell.bold || (row.isGroupHeader && isDescription)
																? 700
																: 500,
														color:
															row.isGroupHeader && isDescription
																? ACCENT
																: "#1e293b",
														textAlign:
															row.isGroupHeader && isDescription
																? "center"
																: cell.align === "right"
																	? "right"
																	: cell.align === "center"
																		? "center"
																		: "left",
														textTransform:
															row.isGroupHeader && isDescription
																? "uppercase"
																: "none",
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
																	color: "#64748b",
																}}
															>
																{`${detail.label}: ${detail.value}`}
															</Text>
														))}
													</View>
												) : null}
											</>
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
		100 - fixedUsed - (hasImageColumn ? COLUMN_WIDTHS.image : 0),
	);
	const flexibleWidth =
		flexibleKeys.length > 0 ? `${remaining / flexibleKeys.length}%` : "0%";

	return keys.reduce<Record<string, string>>(
		(acc, key) => {
			acc[key] =
				key in COLUMN_WIDTHS ? `${COLUMN_WIDTHS[key]}%` : flexibleWidth;
			return acc;
		},
		hasImageColumn ? { image: `${COLUMN_WIDTHS.image}%` } : {},
	);
}

function headerKey(header: CellHeader, index: number) {
	if (index === 0) return "rowNumber";
	return header.key ?? `col-${index}`;
}
