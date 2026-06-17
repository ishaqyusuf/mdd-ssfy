/** @jsxImportSource react */
import { Image, Text, View } from "@react-pdf/renderer";
import type { CustomerStatementPdfData } from "../../../types";

const NAVY = "#1a2e4a";
const ACCENT = "#2563eb";
const LIGHT_BG = "#f0f4fa";
const BORDER = "#d1dae8";
const MUTED = "#64748b";

export function PaymentBlock({
	data,
	qrCodeDataUrl,
}: {
	data: CustomerStatementPdfData;
	qrCodeDataUrl?: string | null;
}) {
	if (!data.paymentLink) return null;

	return (
		<View
			wrap={false}
			style={{
				marginTop: 14,
				borderWidth: 1,
				borderColor: BORDER,
				borderRadius: 5,
				backgroundColor: LIGHT_BG,
				padding: 11,
				flexDirection: "row",
				alignItems: "center",
			}}
		>
			<View style={{ flex: 1, paddingRight: 12 }}>
				<Text
					style={{
						fontSize: 8,
						color: ACCENT,
						textTransform: "uppercase",
						fontWeight: 700,
						marginBottom: 4,
					}}
				>
					Pay Online
				</Text>
				<Text style={{ fontSize: 12, color: NAVY, fontWeight: 700 }}>
					Use the secure payment link for the selected open orders.
				</Text>
				<Text style={{ marginTop: 5, fontSize: 8, color: MUTED }}>
					{data.paymentLink}
				</Text>
			</View>
			{qrCodeDataUrl ? (
				<Image
					src={qrCodeDataUrl}
					style={{
						width: 74,
						height: 74,
						objectFit: "contain",
						backgroundColor: "#ffffff",
						padding: 4,
					}}
				/>
			) : null}
		</View>
	);
}
