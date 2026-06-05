import { Text, View } from "@react-pdf/renderer";

const BORDER = "#d1dae8";
const MUTED = "#64748b";
const NAVY = "#1a2e4a";

function formatDate(value?: Date | string | null) {
	if (!value) return "N/A";
	const date = new Date(value);
	if (Number.isNaN(date.getTime())) return "N/A";

	return new Intl.DateTimeFormat("en-US", {
		month: "short",
		day: "numeric",
		year: "numeric",
		hour: "numeric",
		minute: "2-digit",
	}).format(date);
}

export function FooterBlock({ printedAt }: { printedAt: Date | string }) {
	return (
		<View
			fixed
			style={{
				position: "absolute",
				left: 28,
				right: 28,
				bottom: 20,
				borderTopWidth: 1,
				borderTopColor: BORDER,
				paddingTop: 7,
				flexDirection: "row",
				alignItems: "flex-start",
			}}
		>
			<View style={{ flex: 1, paddingRight: 12 }}>
				<Text style={{ fontSize: 7.5, color: NAVY, fontWeight: 700 }}>
					GND Millwork
				</Text>
				<Text style={{ marginTop: 2, fontSize: 7, color: MUTED }}>
					Thank you for your business. Please contact support@gndmillwork.com
					with questions about this statement.
				</Text>
			</View>
			<View style={{ width: 160, alignItems: "flex-end" }}>
				<Text style={{ fontSize: 7, color: MUTED }}>
					Generated {formatDate(printedAt)}
				</Text>
				<Text
					style={{ marginTop: 2, fontSize: 7, color: MUTED }}
					render={({ pageNumber, totalPages }) =>
						`Page ${pageNumber} of ${totalPages}`
					}
				/>
			</View>
		</View>
	);
}
