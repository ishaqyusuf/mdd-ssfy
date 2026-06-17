/** @jsxImportSource react */
import { Text, View } from "@react-pdf/renderer";
import type { ReactNode } from "react";
import type { CustomerStatementPdfData } from "../../../types";

const NAVY = "#1a2e4a";
const LIGHT_BG = "#f0f4fa";
const BORDER = "#d1dae8";
const MUTED = "#64748b";

function formatCurrency(value?: number | null) {
	return new Intl.NumberFormat("en-US", {
		style: "currency",
		currency: "USD",
	}).format(Number(value || 0));
}

export function StatementTableBlock({
	data,
}: {
	data: CustomerStatementPdfData;
}) {
	return (
		<View
			style={{
				borderWidth: 1,
				borderColor: BORDER,
				borderRadius: 5,
				marginBottom: 8,
			}}
		>
			<View
				style={{
					flexDirection: "row",
					backgroundColor: NAVY,
					paddingVertical: 7,
					paddingHorizontal: 8,
				}}
			>
				<HeaderCell flex={0.8}>Order #</HeaderCell>
				<HeaderCell flex={0.75}>Date</HeaderCell>
				<HeaderCell flex={2.1}>Address</HeaderCell>
				<HeaderCell flex={0.85} align="right">
					Invoice
				</HeaderCell>
				<HeaderCell flex={0.75} align="right">
					Paid
				</HeaderCell>
				<HeaderCell flex={0.85} align="right">
					Balance
				</HeaderCell>
			</View>
			{data.lines.map((line, index) => (
				<View
					key={line.salesId}
					wrap={false}
					style={{
						flexDirection: "row",
						paddingVertical: 7,
						paddingHorizontal: 8,
						borderBottomWidth: 1,
						borderBottomColor: BORDER,
						backgroundColor: index % 2 === 0 ? "#ffffff" : "#fbfdff",
					}}
				>
					<BodyCell flex={0.8} bold>
						{line.orderNo}
					</BodyCell>
					<BodyCell flex={0.75}>{line.date}</BodyCell>
					<BodyCell flex={2.1} muted>
						{line.address || "-"}
					</BodyCell>
					<BodyCell flex={0.85} align="right">
						{formatCurrency(line.invoice)}
					</BodyCell>
					<BodyCell flex={0.75} align="right" muted>
						{formatCurrency(line.paid)}
					</BodyCell>
					<BodyCell flex={0.85} align="right" bold>
						{formatCurrency(line.pending)}
					</BodyCell>
				</View>
			))}
			<View
				wrap={false}
				style={{
					flexDirection: "row",
					backgroundColor: LIGHT_BG,
					paddingVertical: 8,
					paddingHorizontal: 8,
				}}
			>
				<Text style={{ flex: 5.25, fontSize: 9, fontWeight: 700, color: NAVY }}>
					Total Open Balance
				</Text>
				<Text
					style={{
						flex: 0.85,
						fontSize: 10,
						fontWeight: 700,
						color: NAVY,
						textAlign: "right",
					}}
				>
					{formatCurrency(data.summary.balanceDue)}
				</Text>
			</View>
		</View>
	);
}

function HeaderCell({
	children,
	flex,
	align = "left",
}: {
	children: ReactNode;
	flex: number;
	align?: "left" | "right";
}) {
	return (
		<Text
			style={{
				flex,
				fontSize: 8,
				fontWeight: 700,
				color: "#ffffff",
				textAlign: align,
				textTransform: "uppercase",
			}}
		>
			{children}
		</Text>
	);
}

function BodyCell({
	children,
	flex,
	align = "left",
	bold = false,
	muted = false,
}: {
	children: ReactNode;
	flex: number;
	align?: "left" | "right";
	bold?: boolean;
	muted?: boolean;
}) {
	return (
		<Text
			style={{
				flex,
				fontSize: 8.5,
				fontWeight: bold ? 700 : 400,
				color: muted ? MUTED : "#0f172a",
				textAlign: align,
				paddingRight: align === "right" ? 0 : 6,
			}}
		>
			{children}
		</Text>
	);
}
