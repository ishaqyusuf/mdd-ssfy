/** @jsxImportSource react */
import { Column, Row, Section, Text } from "@react-email/components";
import { emailTheme } from "./theme";

export function Logo() {
	return (
		<Section
			className="email-receipt-header"
			style={{
				borderBottom: `1px solid ${emailTheme.light.border}`,
				paddingBottom: 20,
			}}
		>
			<Row>
				<Column style={{ verticalAlign: "middle" }}>
					<Text
						className="email-text m-0 text-[13px] font-semibold tracking-[1.4px]"
						style={{ color: emailTheme.light.foreground }}
					>
						GND MILLWORK
					</Text>
					<Text
						className="email-muted m-0 mt-[3px] text-[12px] tracking-[0.4px]"
						style={{ color: emailTheme.light.muted }}
					>
						DESIGN · BUILD · INSTALL
					</Text>
				</Column>
			</Row>
		</Section>
	);
}
