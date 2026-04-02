import { Text, View } from "@react-pdf/renderer";
import type { CellHeader, LineItemSection } from "@gnd/sales/print/types";

// ─── Design tokens ─────────────────────────────────────────
const NAVY = "#1a2e4a";
const ACCENT = "#2563eb";
const BORDER = "#d1dae8";
const ROW_ALT = "#f8fafc";

const COLUMN_WIDTHS: Record<string, number> = {
	rowNumber: 6,
	swing: 11,
	qty: 7,
	packing: 12,
	rate: 9,
	total: 10,
};

interface LineItemBlockProps {
	section: LineItemSection;
}

export function LineItemBlock({ section }: LineItemBlockProps) {
	const widths = getColumnWidths(section.headers);

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
				{/* Column headers */}
				<View
					style={{
						flexDirection: "row",
						backgroundColor: "#e2e8f0",
						borderBottomWidth: 1,
						borderBottomColor: BORDER,
					}}
				>
					{section.headers.map((h, index) => (
						<View
							key={h.title}
							style={{
								width: widths[headerKey(h, index)],
								paddingVertical: 4,
								paddingHorizontal: 5,
								borderRightWidth: index < section.headers.length - 1 ? 1 : 0,
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
					))}
				</View>

				{/* Data rows */}
				{section.rows.map((row, ri) => (
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
						{row.cells.map((cell, ci) => {
							const key = headerKey(section.headers[ci]!, ci);
							const isDescription = key === "description";

							return (
								<View
									key={ci}
									style={{
										width: widths[key],
										paddingVertical: 3,
										paddingHorizontal: 5,
										borderRightWidth: ci < row.cells.length - 1 ? 1 : 0,
										borderRightColor: BORDER,
										justifyContent: "center",
									}}
								>
									<Text
										style={{
											fontSize: 8.5,
											fontWeight:
												cell.bold || (row.isGroupHeader && isDescription)
													? 700
													: 500,
											color:
												row.isGroupHeader && isDescription ? ACCENT : "#1e293b",
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
								</View>
							);
						})}
					</View>
				))}
			</View>
		</View>
	);
}

function getColumnWidths(headers: CellHeader[]) {
	const keys = headers.map((header, index) => headerKey(header, index));
	const fixedUsed = keys.reduce(
		(sum, key) => sum + (COLUMN_WIDTHS[key] ?? 0),
		0,
	);
	const flexibleKeys = keys.filter((key) => !(key in COLUMN_WIDTHS));
	const remaining = Math.max(0, 100 - fixedUsed);
	const flexibleWidth =
		flexibleKeys.length > 0 ? `${remaining / flexibleKeys.length}%` : "0%";

	return keys.reduce<Record<string, string>>((acc, key) => {
		acc[key] = key in COLUMN_WIDTHS ? `${COLUMN_WIDTHS[key]}%` : flexibleWidth;
		return acc;
	}, {});
}

function headerKey(header: CellHeader, index: number) {
	if (index === 0) return "rowNumber";
	return header.key ?? `col-${index}`;
}
