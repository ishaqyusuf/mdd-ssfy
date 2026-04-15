import type { PrintSigningData } from "@gnd/sales/print/types";
import { Image, Text, View } from "@react-pdf/renderer";
import { resolveImageSrc } from "../../../shared/utils";

// ─── Design tokens ─────────────────────────────────────────
const BORDER = "#d1dae8";
const TEXT_MUTED = "#64748b";

interface SignatureBlockProps {
	label?: string;
	signing?: PrintSigningData | null;
	baseUrl?: string;
}

export function SignatureBlock({
	label = "Customer Signature",
	signing,
	baseUrl,
}: SignatureBlockProps) {
	const signatureUrl = resolveImageSrc(signing?.signatureUrl, baseUrl);

	return (
		<View style={{ paddingHorizontal: 16, paddingTop: 12, paddingBottom: 8 }}>
			<View style={{ flexDirection: "row", gap: 24, alignItems: "flex-end" }}>
				<View style={{ flex: 2 }}>
					<View
						style={{
							height: 36,
							borderBottomWidth: 1,
							borderBottomColor: BORDER,
							borderStyle: "dashed",
							marginBottom: 4,
							justifyContent: "flex-end",
						}}
					>
						{signatureUrl ? (
							<Image
								src={signatureUrl}
								style={{ height: 30, width: "100%", objectFit: "contain" }}
							/>
						) : null}
					</View>
					<Text
						style={{ fontSize: 7.5, color: TEXT_MUTED, fontStyle: "italic" }}
					>
						{label}
					</Text>
					{signing?.receivedBy ? (
						<Text style={{ fontSize: 8, marginTop: 2 }}>
							Received by: {signing.receivedBy}
						</Text>
					) : null}
					{signing?.packedBy ? (
						<Text style={{ fontSize: 8, marginTop: 2 }}>
							Packed by: {signing.packedBy}
						</Text>
					) : null}
				</View>
				<View style={{ flex: 1 }}>
					<View
						style={{
							height: 36,
							borderBottomWidth: 1,
							borderBottomColor: BORDER,
							borderStyle: "dashed",
							marginBottom: 4,
						}}
					/>
					<Text
						style={{ fontSize: 7.5, color: TEXT_MUTED, fontStyle: "italic" }}
					>
						Date
					</Text>
					{signing?.signedAt ? (
						<Text style={{ fontSize: 8, marginTop: 2 }}>
							{new Date(signing.signedAt).toLocaleDateString("en-US")}
						</Text>
					) : null}
				</View>
			</View>
		</View>
	);
}
