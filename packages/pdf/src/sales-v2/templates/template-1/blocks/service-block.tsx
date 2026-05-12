import type { ServiceSection } from "@gnd/sales/print/types";
import { colorsObject, hexToRgba } from "@gnd/utils/colors";
import { Text, View } from "@react-pdf/renderer";
import { cn } from "../../../../utils/tw";
import { getSectionLeadInPresenceAhead } from "../../../shared/pagination";
import { colWidth, sumColSpans } from "../../../shared/utils";

interface ServiceBlockProps {
	section: ServiceSection;
}
const BORDER_COLOR = "#9ca3af";

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
				...cn(`flex-row border-b font-medium text-xs`),
				borderColor: BORDER_COLOR,
			}}
		>
			{row.cells.map((cell, ci) => {
				const align = cell.align || "left";
				const alignClass =
					align === "right"
						? "text-right"
						: align === "center"
							? "text-center"
							: "text-left";

				return (
					<View
						key={ci}
						style={{
							...cn(
								`p-1 ${alignClass} ${cell.bold ? "font-bold" : ""} ${ci === row.cells.length - 1 ? "" : "border-r uppercase"}`,
							),
							width: colWidth(cell.colSpan, totalSpan),
							borderColor: BORDER_COLOR,
						}}
					>
						<Text>{cell.value ?? ""}</Text>
					</View>
				);
			})}
		</View>
	);

	return (
		<View
			style={{
				...cn(`flex-col border-x border-t text-sm`),
				borderColor: BORDER_COLOR,
			}}
		>
			<View wrap={false} minPresenceAhead={getSectionLeadInPresenceAhead()}>
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

				{section.rows.length > 0 && (
					<View
						style={{ ...cn(`flex-row border-t`), borderColor: BORDER_COLOR }}
					>
						{section.headers.map((h, i) => (
							<View
								key={i}
								style={{
									...cn(
										`p-1 font-semibold uppercase ${i === section.headers.length - 1 ? "" : "border-r"}`,
									),
									width: colWidth(h.colSpan, totalSpan),
									backgroundColor: hexToRgba(colorsObject.black, 0.2),
									borderColor: BORDER_COLOR,
								}}
							>
								<Text>{h.title}</Text>
							</View>
						))}
					</View>
				)}

				{firstRow ? renderRow(firstRow, 0, "first") : null}
			</View>

			{remainingRows.length > 0 && (
				<View style={cn(`flex-col`)}>
					{remainingRows.map((row, rowIndex) =>
						renderRow(row, rowIndex + 1, rowIndex + 1),
					)}
				</View>
			)}
		</View>
	);
}
