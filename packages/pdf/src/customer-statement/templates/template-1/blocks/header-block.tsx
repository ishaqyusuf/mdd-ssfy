/** @jsxImportSource react */
import type { CompanyAddress } from "@gnd/sales/print/types";
import { Image, Text, View } from "@react-pdf/renderer";
import { resolveLogoSrc } from "../../../../sales-v2/shared/utils";
import type { CustomerStatementPdfData } from "../../../types";

const NAVY = "#1a2e4a";
const ACCENT = "#2563eb";
const MUTED = "#64748b";
const BORDER = "#d1dae8";

function formatDate(value?: Date | string | null) {
	if (!value) return "N/A";
	const date = new Date(value);
	if (Number.isNaN(date.getTime())) return "N/A";

	return new Intl.DateTimeFormat("en-US", {
		month: "short",
		day: "numeric",
		year: "numeric",
	}).format(date);
}

function formatCurrency(value?: number | null) {
	return new Intl.NumberFormat("en-US", {
		style: "currency",
		currency: "USD",
	}).format(Number(value || 0));
}

function CompanyAddressLines({ address }: { address: CompanyAddress }) {
	return (
		<View>
			<Text style={{ fontSize: 8, color: MUTED, marginBottom: 1 }}>
				{address.address1}
			</Text>
			{address.address2 ? (
				<Text style={{ fontSize: 8, color: MUTED, marginBottom: 1 }}>
					{address.address2}
				</Text>
			) : null}
			<Text style={{ fontSize: 8, color: MUTED, marginBottom: 1 }}>
				{address.phone}
			</Text>
			{address.fax ? (
				<Text style={{ fontSize: 8, color: MUTED, marginBottom: 1 }}>
					Fax: {address.fax}
				</Text>
			) : null}
			<Text style={{ fontSize: 8, color: MUTED }}>support@gndmillwork.com</Text>
		</View>
	);
}

export function HeaderBlock({
	data,
	baseUrl,
	logoUrl,
}: {
	data: CustomerStatementPdfData;
	baseUrl?: string;
	logoUrl?: string | null;
}) {
	const logoSrc = resolveLogoSrc(baseUrl, logoUrl);

	return (
		<View>
			<View
				style={{
					height: 4,
					backgroundColor: ACCENT,
					marginBottom: 16,
					borderRadius: 2,
				}}
			/>
			<View style={{ flexDirection: "row", marginBottom: 16 }}>
				<View style={{ flex: 1 }}>
					<Image
						src={logoSrc}
						style={{
							width: 140,
							height: 66,
							objectFit: "contain",
							marginBottom: 8,
						}}
					/>
					<CompanyAddressLines address={data.companyAddress} />
				</View>
				<View style={{ width: 228 }}>
					<View
						style={{
							backgroundColor: NAVY,
							borderRadius: 4,
							paddingHorizontal: 10,
							paddingVertical: 6,
							marginBottom: 8,
							alignItems: "flex-end",
						}}
					>
						<Text
							style={{
								color: "#ffffff",
								fontSize: 14,
								fontWeight: 700,
								textTransform: "uppercase",
								letterSpacing: 0.8,
							}}
						>
							Customer Statement
						</Text>
					</View>
					<View
						style={{
							borderWidth: 1,
							borderColor: BORDER,
							borderRadius: 4,
							padding: 8,
						}}
					>
						<MetaRow label="Statement Date" value={formatDate(data.printedAt)} />
						<MetaRow label="Account" value={data.customer.accountNo || "-"} />
						<MetaRow label="Orders" value={String(data.summary.orderCount)} />
						<MetaRow
							label="Balance Due"
							value={formatCurrency(data.summary.balanceDue)}
							emphasis
						/>
					</View>
				</View>
			</View>
		</View>
	);
}

function MetaRow({
	label,
	value,
	emphasis = false,
}: {
	label: string;
	value: string;
	emphasis?: boolean;
}) {
	return (
		<View
			style={{
				flexDirection: "row",
				justifyContent: "space-between",
				marginBottom: 4,
				gap: 10,
			}}
		>
			<Text style={{ fontSize: 8, color: MUTED }}>{label}</Text>
			<Text
				style={{
					fontSize: emphasis ? 10 : 8,
					color: emphasis ? NAVY : "#0f172a",
					fontWeight: emphasis ? 700 : 500,
					textAlign: "right",
				}}
			>
				{value}
			</Text>
		</View>
	);
}
