import type { PrintSigningData } from "@gnd/sales/print/types";
import { Image, Text, View } from "@react-pdf/renderer";
import { cn } from "../../../../utils/tw";
import { resolveImageSrc } from "../../../shared/utils";

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
	const signatureUrl = resolveImageSrc(signing?.signatureUrl, baseUrl);

	return (
		<View wrap={false} style={cn("px-4 mt-4 mb-2")}>
			<View style={cn("flex-row justify-between")}>
				<View style={{ width: "70%" }}>
					<View
						style={{
							...cn("border-b"),
							height: 40,
							borderStyle: "dashed",
							justifyContent: "flex-end",
						}}
					>
						{signatureUrl ? (
							<Image
								src={signatureUrl}
								style={{ height: 32, width: "100%", objectFit: "contain" }}
							/>
						) : null}
					</View>
					<Text style={cn("mt-1 text-sm italic font-semibold")}>{label}</Text>
					{signing?.receivedBy ? (
						<Text style={cn("mt-1 text-xs")}>
							Received by: {signing.receivedBy}
						</Text>
					) : null}
					{signing?.packedBy ? (
						<Text style={cn("mt-1 text-xs")}>
							Packed by: {signing.packedBy}
						</Text>
					) : null}
				</View>
			</View>
		</View>
	);
}
