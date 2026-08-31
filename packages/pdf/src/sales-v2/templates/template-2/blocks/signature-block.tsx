/** @jsxImportSource react */
import type { PrintSigningData } from "@gnd/sales/print/types";
import { Image, Path, Svg, Text, View } from "@react-pdf/renderer";
import { isSvgImageSource } from "../../../shared/signature-source";
import { resolveDocumentImageSrc } from "../../../shared/utils";

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
	const resolvedSignatureUrl = resolveDocumentImageSrc(
		signing?.signatureUrl,
		baseUrl,
	);
	const signatureUrl = isSvgImageSource(resolvedSignatureUrl)
		? null
		: resolvedSignatureUrl;
	const lineHeight = 52;

	return (
		<View style={{ paddingHorizontal: 16, paddingTop: 12, paddingBottom: 8 }}>
			<View style={{ flexDirection: "row", alignItems: "flex-end" }}>
				<View style={{ width: "33.3333%" }}>
					<View
						style={{
							height: lineHeight,
							borderBottomWidth: 1,
							borderBottomColor: BORDER,
							borderStyle: "dashed",
							marginBottom: 4,
							position: "relative",
						}}
					>
						{signing?.signaturePath ? (
							<Svg
								viewBox="0 0 320 160"
								style={{
									position: "absolute",
									left: 0,
									bottom: 0,
									height: 44,
									width: "100%",
								}}
							>
								<Path
									d={signing.signaturePath}
									fill="none"
									stroke="#111827"
									strokeWidth={2}
									strokeLinecap="round"
									strokeLinejoin="round"
								/>
							</Svg>
						) : signatureUrl ? (
							<Image
								src={signatureUrl}
								style={{
									position: "absolute",
									left: 0,
									bottom: 0,
									height: 44,
									width: "100%",
									objectFit: "contain",
								}}
							/>
						) : null}
					</View>
					<Text
						style={{ fontSize: 7.5, color: TEXT_MUTED, fontStyle: "italic" }}
					>
						{label}
					</Text>
				</View>
				<View style={{ width: "33.3333%" }} />
				<View style={{ width: "33.3333%" }}>
					<View
						style={{
							height: lineHeight,
							borderBottomWidth: 1,
							borderBottomColor: BORDER,
							borderStyle: "dashed",
							marginBottom: 4,
							justifyContent: "flex-end",
						}}
					>
						{signing?.signedAt ? (
							<Text
								style={{
									fontSize: 16,
									fontFamily: "GreatVibes",
								}}
							>
								{new Date(signing.signedAt).toLocaleDateString("en-US")}
							</Text>
						) : null}
					</View>
					<Text
						style={{ fontSize: 7.5, color: TEXT_MUTED, fontStyle: "italic" }}
					>
						Date
					</Text>
				</View>
			</View>
			<View style={{ marginTop: 10 }}>
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
		</View>
	);
}
