/** @jsxImportSource react */
import { Text, View } from "@react-pdf/renderer";
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

export function SummaryBlock({ data }: { data: CustomerStatementPdfData }) {
	return (
		<View style={{ marginBottom: 14 }}>
			<View
				style={{
					borderWidth: 1,
					borderColor: BORDER,
					backgroundColor: LIGHT_BG,
					borderRadius: 5,
					padding: 12,
					marginBottom: 10,
					flexDirection: "row",
				}}
			>
				<View style={{ flex: 1, paddingRight: 14 }}>
					<Text
						style={{
							fontSize: 8,
							color: MUTED,
							textTransform: "uppercase",
							marginBottom: 3,
						}}
					>
						Statement For
					</Text>
					<Text style={{ fontSize: 16, fontWeight: 700, color: NAVY }}>
						{data.customer.displayName}
					</Text>
					<View style={{ marginTop: 5 }}>
						{data.customer.email ? (
							<Text style={{ fontSize: 9, color: MUTED, marginBottom: 2 }}>
								{data.customer.email}
							</Text>
						) : null}
						{data.customer.phoneNo ? (
							<Text style={{ fontSize: 9, color: MUTED, marginBottom: 2 }}>
								{data.customer.phoneNo}
							</Text>
						) : null}
						{data.customer.address ? (
							<Text style={{ fontSize: 9, color: MUTED }}>
								{data.customer.address}
							</Text>
						) : null}
					</View>
				</View>
				<View style={{ width: 168 }}>
					<Text
						style={{
							fontSize: 8,
							color: MUTED,
							textTransform: "uppercase",
							marginBottom: 3,
							textAlign: "right",
						}}
					>
						Total Balance Due
					</Text>
					<Text
						style={{
							fontSize: 24,
							fontWeight: 700,
							color: NAVY,
							textAlign: "right",
						}}
					>
						{formatCurrency(data.summary.balanceDue)}
					</Text>
				</View>
			</View>
			<View style={{ flexDirection: "row", gap: 8 }}>
				<MetricCard label="Invoice Total" value={data.summary.invoiceTotal} />
				<MetricCard label="Paid" value={data.summary.paidTotal} />
				<MetricCard
					label="Open Balance"
					value={data.summary.balanceDue}
					emphasis
				/>
			</View>
		</View>
	);
}

function MetricCard({
	label,
	value,
	emphasis = false,
}: {
	label: string;
	value: number;
	emphasis?: boolean;
}) {
	return (
		<View
			style={{
				flex: 1,
				borderWidth: 1,
				borderColor: emphasis ? NAVY : BORDER,
				borderRadius: 4,
				padding: 9,
				backgroundColor: "#ffffff",
			}}
		>
			<Text
				style={{
					fontSize: 8,
					color: MUTED,
					textTransform: "uppercase",
					marginBottom: 4,
				}}
			>
				{label}
			</Text>
			<Text
				style={{
					fontSize: 13,
					fontWeight: 700,
					color: emphasis ? NAVY : "#0f172a",
				}}
			>
				{formatCurrency(value)}
			</Text>
		</View>
	);
}
