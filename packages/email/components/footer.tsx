/** @jsxImportSource react */
import { Section, Text } from "@react-email/components";
import { emailTheme } from "./theme";

export function Footer() {
	return (
		<Section
			className="email-receipt-footer"
			style={{
				backgroundColor: "#f6f7f3",
				borderTop: `1px solid ${emailTheme.light.border}`,
				marginTop: 28,
				padding: "22px 0 4px",
			}}
		>
			<Text
				className="email-text m-0 text-[14px] leading-[21px]"
				style={{ color: emailTheme.light.foreground }}
			>
				Regards,
			</Text>
			<Text
				className="email-text m-0 mt-[6px] text-[15px] font-semibold"
				style={{ color: emailTheme.light.foreground }}
			>
				GND Millwork Team
			</Text>
			<Text
				className="email-muted m-0 mt-[14px] text-[12px] leading-[18px]"
				style={{ color: emailTheme.light.muted }}
			>
				13285 SW 131st St, Miami, FL 33186 · Questions? Reply directly to this
				email.
			</Text>
		</Section>
	);
}
