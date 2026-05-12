import type { ServiceSection } from "@gnd/sales/print/types";
import { Text, View } from "@react-pdf/renderer";
import { getSectionLeadInPresenceAhead } from "../../../shared/pagination";
import { colWidth, sumColSpans } from "../../../shared/utils";

// ─── Design tokens ─────────────────────────────────────────
const NAVY = "#1a2e4a";
const BORDER = "#d1dae8";
const ROW_ALT = "#f8fafc";

interface ServiceBlockProps {
	section: ServiceSection;
}

export function ServiceBlock({ section }: ServiceBlockProps) {
	const totalSpan = sumColSpans(section.headers);
	const [firstRow, ...remainingRows] = section.rows;
	const renderRow = (
		row: ServiceSection["rows"][number],
		rowIndex: number,
		key: string | number,
	) => (
		<View
			wrap={false}
			key={key}
			style={{
				flexDirection: "row",
				backgroundColor: rowIndex % 2 === 0 ? "#ffffff" : ROW_ALT,
				borderBottomWidth: rowIndex < section.rows.length - 1 ? 1 : 0,
				borderBottomColor: BORDER,
			}}
		>
			{row.cells.map((cell, ci) => {
				const align = cell.align || "left";
				const textAlign =
					align === "right" ? "right" : align === "center" ? "center" : "left";

				return (
					<View
						key={ci}
						style={{
							width: colWidth(cell.colSpan, totalSpan),
							paddingVertical: 3,
							paddingHorizontal: 5,
							borderRightWidth: ci < row.cells.length - 1 ? 1 : 0,
							borderRightColor: BORDER,
							justifyContent: "center",
						}}
					>
						<Text
							style={{
								fontSize: 7.5,
								fontWeight: cell.bold ? 700 : 400,
								color: "#1e293b",
								textAlign,
							}}
						>
							{cell.value ?? ""}
						</Text>
					</View>
				);
			})}
		</View>
	);

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
			<View
				wrap={false}
				minPresenceAhead={getSectionLeadInPresenceAhead()}
				style={{ flexDirection: "column" }}
			>
				{/* Section title */}
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
						{String(section.title || "").toUpperCase()}
					</Text>
				</View>

				{section.rows.length > 0 && (
					<View
						style={{
							flexDirection: "row",
							backgroundColor: "#e2e8f0",
							borderBottomWidth: 1,
							borderBottomColor: BORDER,
						}}
					>
						{section.headers.map((h, i) => (
							<View
								key={i}
								style={{
									width: colWidth(h.colSpan, totalSpan),
									paddingVertical: 4,
									paddingHorizontal: 5,
									borderRightWidth: i < section.headers.length - 1 ? 1 : 0,
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
									}}
								>
									{h.title}
								</Text>
							</View>
						))}
					</View>
				)}

				{firstRow ? renderRow(firstRow, 0, "first") : null}
			</View>

			{remainingRows.length > 0 && (
				<View style={{ flexDirection: "column" }}>
					{remainingRows.map((row, rowIndex) =>
						renderRow(row, rowIndex + 1, rowIndex + 1),
					)}
				</View>
			)}
		</View>
	);
}
