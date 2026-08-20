/** @jsxImportSource react */
import type { PrintSpecialOrderData } from "@gnd/sales/print/types";
import { Image, Text, View } from "@react-pdf/renderer";
import { getSpecialOrderColors } from "./special-order-colors";

interface SpecialOrderBlockProps {
	specialOrder: PrintSpecialOrderData | null;
}

export function SpecialOrderBlock({ specialOrder }: SpecialOrderBlockProps) {
	if (!specialOrder) return null;
	const colors = getSpecialOrderColors(specialOrder.status);

	if (specialOrder.compact) {
		return (
			<View
				wrap={false}
				style={{
					backgroundColor: colors.background,
					borderColor: colors.border,
					borderRadius: 3,
					borderWidth: 1,
					marginBottom: 8,
					paddingHorizontal: 8,
					paddingVertical: 5,
				}}
			>
				<Text
					style={{ color: colors.foreground, fontSize: 9, fontWeight: 700 }}
				>
					SPECIAL ORDER · {specialOrder.label.toUpperCase()}
				</Text>
			</View>
		);
	}

	return (
		<View
			wrap={false}
			style={{
				backgroundColor: colors.background,
				borderColor: colors.border,
				borderRadius: 3,
				borderWidth: 1,
				marginBottom: 8,
				padding: 8,
			}}
		>
			<Text
				style={{
					color: colors.foreground,
					fontSize: 10,
					fontWeight: 700,
					marginBottom: 4,
				}}
			>
				SPECIAL ORDER · {specialOrder.label.toUpperCase()}
			</Text>
			{specialOrder.policyTitle ? (
				<Text style={{ fontSize: 8, fontWeight: 700, marginBottom: 3 }}>
					{specialOrder.policyTitle}
					{specialOrder.policyVersion
						? ` · Policy v${specialOrder.policyVersion}`
						: ""}
				</Text>
			) : null}
			{specialOrder.policyText ? (
				<Text style={{ fontSize: 7.5, lineHeight: 1.35, marginBottom: 3 }}>
					{specialOrder.policyText}
				</Text>
			) : null}
			{specialOrder.acknowledgmentText ? (
				<Text style={{ fontSize: 7.5, fontWeight: 700, lineHeight: 1.35 }}>
					{specialOrder.acknowledgmentText}
				</Text>
			) : null}
			{specialOrder.signerName ? (
				<View style={{ marginTop: 5 }}>
					<Text style={{ fontSize: 7.5 }}>
						Approved by {specialOrder.signerName}
						{specialOrder.approvedAt
							? ` on ${new Date(specialOrder.approvedAt).toLocaleString("en-US")}`
							: ""}
					</Text>
					{specialOrder.signatureUrl ? (
						<Image
							src={specialOrder.signatureUrl}
							style={{
								height: 28,
								marginTop: 3,
								objectFit: "contain",
								width: 120,
							}}
						/>
					) : null}
				</View>
			) : null}
		</View>
	);
}
