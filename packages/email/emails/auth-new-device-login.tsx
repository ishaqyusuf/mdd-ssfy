/** @jsxImportSource react */
import { Column, Row, Section, Text } from "@react-email/components";

import {
	StandardEmailHeader,
	StandardEmailHero,
	StandardEmailLayout,
	StandardEmailSignature,
	standardEmailColors,
} from "../components/standard-email";

interface Props {
	accountName?: string | null;
	accountEmail: string;
	appSurface: "www" | "dealership";
	deviceLabel: string;
	ipAddress?: string | null;
	userAgent?: string | null;
	loginAt: string;
	supportEmail: string;
	securityMessage: string;
}

function formatSurface(surface: Props["appSurface"]) {
	return surface === "dealership" ? "GND Dealership" : "GND Workspace";
}

export default function AuthNewDeviceLoginEmail({
	accountName,
	accountEmail,
	appSurface,
	deviceLabel,
	ipAddress,
	userAgent,
	loginAt,
	supportEmail,
	securityMessage,
}: Props) {
	return (
		<StandardEmailLayout previewText="New device login to your GND account">
			<StandardEmailHeader
				documentLabel="Security alert"
				documentMeta={formatSurface(appSurface)}
			/>

			<StandardEmailHero
				eyebrow="New device detected"
				recipientName={accountName || accountEmail}
				title="New Device Login"
			>
				<Text
					className="gnd-standard-text m-0 mt-[10px] text-[15px] leading-[24px]"
					style={{ color: standardEmailColors.ink }}
				>
					Your {formatSurface(appSurface)} account was just accessed from a
					device we have not seen before.
				</Text>
			</StandardEmailHero>

			<Section
				className="gnd-standard-panel gnd-standard-border mx-[36px] mt-[28px] rounded-[6px] border border-solid p-[20px]"
				style={{ borderColor: standardEmailColors.border }}
			>
				<Row>
					<Column
						className="gnd-standard-mobile-stack"
						style={{ width: "56%" }}
					>
						<Text
							className="gnd-standard-muted m-0 text-[12px] font-semibold uppercase tracking-[0.8px]"
							style={{ color: standardEmailColors.muted }}
						>
							Device
						</Text>
						<Text
							className="gnd-standard-text m-0 mt-[6px] text-[15px] font-semibold"
							style={{ color: standardEmailColors.ink }}
						>
							{deviceLabel}
						</Text>
					</Column>
					<Column
						className="gnd-standard-mobile-stack"
						style={{ width: "44%" }}
					>
						<Text
							className="gnd-standard-muted m-0 text-[12px] font-semibold uppercase tracking-[0.8px]"
							style={{ color: standardEmailColors.muted }}
						>
							IP address
						</Text>
						<Text
							className="gnd-standard-text m-0 mt-[6px] text-[14px] font-semibold"
							style={{ color: standardEmailColors.ink }}
						>
							{ipAddress || "Unavailable"}
						</Text>
					</Column>
				</Row>

				<Text
					className="gnd-standard-muted m-0 mt-[18px] text-[12px] font-semibold uppercase tracking-[0.8px]"
					style={{ color: standardEmailColors.muted }}
				>
					When
				</Text>
				<Text
					className="gnd-standard-text m-0 mt-[5px] text-[14px] leading-[21px]"
					style={{ color: standardEmailColors.ink }}
				>
					{loginAt}
				</Text>

				<Text
					className="gnd-standard-muted m-0 mt-[18px] text-[12px] font-semibold uppercase tracking-[0.8px]"
					style={{ color: standardEmailColors.muted }}
				>
					Browser details
				</Text>
				<Text
					className="gnd-standard-muted m-0 mt-[5px] text-[12px] leading-[18px]"
					style={{ color: standardEmailColors.muted, wordBreak: "break-word" }}
				>
					{userAgent || "User agent unavailable"}
				</Text>
			</Section>

			<Section
				className="gnd-standard-panel gnd-standard-soft-danger gnd-standard-border mx-[36px] mt-[18px] rounded-[6px] border border-solid px-[20px] py-[17px]"
				style={{
					backgroundColor: standardEmailColors.softDanger,
					borderColor: standardEmailColors.border,
				}}
			>
				<Text
					className="gnd-standard-danger-text m-0 text-[12px] font-semibold uppercase tracking-[0.8px]"
					style={{ color: standardEmailColors.danger }}
				>
					If this was not you
				</Text>
				<Text
					className="gnd-standard-text m-0 mt-[7px] text-[14px] leading-[22px]"
					style={{ color: standardEmailColors.ink }}
				>
					{securityMessage}
				</Text>
			</Section>

			<Section className="gnd-standard-content px-[36px] pb-[34px] pt-[22px]">
				<Text
					className="gnd-standard-muted m-0 text-[12px] leading-[19px]"
					style={{ color: standardEmailColors.muted, wordBreak: "break-word" }}
				>
					This alert was sent to {accountEmail}. Support contact: {supportEmail}
					.
				</Text>
			</Section>

			<StandardEmailSignature
				department="Account security · GND Millwork"
				senderName="GND Millwork Security"
			/>
		</StandardEmailLayout>
	);
}

AuthNewDeviceLoginEmail.PreviewProps = {
	accountName: "Jordan Lee",
	accountEmail: "jordan@example.invalid",
	appSurface: "dealership",
	deviceLabel: "Chrome on macOS",
	ipAddress: "203.0.113.24",
	userAgent: "Chrome 140 on macOS",
	loginAt: "August 29, 2026 at 10:42 AM WAT",
	supportEmail: "support@gndprodesk.com",
	securityMessage:
		"If this was not you, reset your password and contact support immediately.",
} satisfies Props;
