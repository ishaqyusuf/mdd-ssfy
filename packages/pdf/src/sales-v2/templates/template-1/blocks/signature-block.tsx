/** @jsxImportSource react */
import type { PrintSigningData } from "@gnd/sales/print/types";
import { Image, Path, Svg, Text, View } from "@react-pdf/renderer";
import { cn } from "../../../../utils/tw";
import { isSvgImageSource } from "../../../shared/signature-source";
import { resolveDocumentImageSrc } from "../../../shared/utils";

interface SignatureBlockProps {
	label?: string;
	signing?: PrintSigningData | null;
	baseUrl?: string;
}

export function SignatureBlock({
	label = "Customer Signature & date",
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
		<View wrap={false} style={cn("px-4 mt-4 mb-2")}>
			<View style={cn("flex-row justify-between")}>
				<View style={{ width: "33.3333%" }}>
					<View
						style={{
							...cn("border-b"),
							height: lineHeight,
							borderStyle: "dashed",
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
					<Text style={cn("mt-1 text-sm italic font-semibold")}>{label}</Text>
				</View>
				<View style={{ width: "33.3333%" }} />
				<View style={{ width: "33.3333%" }}>
					<View
						style={{
							...cn("border-b"),
							height: lineHeight,
							borderStyle: "dashed",
							justifyContent: "flex-end",
						}}
					>
						{signing?.signedAt ? (
							<Text
								style={{
									...cn("text-xs"),
									fontFamily: "GreatVibes",
									fontSize: 16,
								}}
							>
								{new Date(signing.signedAt).toLocaleDateString("en-US")}
							</Text>
						) : null}
					</View>
					<Text style={cn("mt-1 text-sm italic font-semibold")}>Date</Text>
				</View>
			</View>
			<View style={cn("mt-3 flex-col gap-1")}>
				{signing?.receivedBy ? (
					<Text style={cn("text-xs")}>Received by: {signing.receivedBy}</Text>
				) : null}
				{signing?.packedBy ? (
					<Text style={cn("text-xs")}>Packed by: {signing.packedBy}</Text>
				) : null}
			</View>
		</View>
	);
}
