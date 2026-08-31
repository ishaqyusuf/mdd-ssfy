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
	loginAt: string;
	ipAddress?: string | null;
	userAgent?: string | null;
	sessionId: string;
	actorLabel: string;
	supportEmail: string;
}

function formatSurface(surface: Props["appSurface"]) {
	return surface === "dealership" ? "GND Dealership" : "GND Workspace";
}

export default function AuthMasterPasswordLoginAlertEmail({
	accountName,
	accountEmail,
	appSurface,
	loginAt,
	ipAddress,
	userAgent,
	sessionId,
	actorLabel,
	supportEmail,
}: Props) {
	return (
		<StandardEmailLayout previewText="Master password login activity">
			<StandardEmailHeader
				documentLabel="Privileged access"
				documentMeta={formatSurface(appSurface)}
			/>

			<StandardEmailHero
				eyebrow="Security monitoring"
				title="Master Password Login Activity"
			>
				<Text
					className="gnd-standard-text m-0 mt-[14px] text-[15px] leading-[24px]"
					style={{ color: standardEmailColors.ink }}
				>
					A {formatSurface(appSurface)} account was accessed using{" "}
					{actorLabel || "Master password"}.
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
							Account
						</Text>
						<Text
							className="gnd-standard-text m-0 mt-[6px] text-[15px] font-semibold"
							style={{ color: standardEmailColors.ink }}
						>
							{accountName || "Unnamed account"}
						</Text>
						<Text
							className="gnd-standard-muted m-0 mt-[3px] text-[12px] leading-[18px]"
							style={{
								color: standardEmailColors.muted,
								wordBreak: "break-word",
							}}
						>
							{accountEmail}
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

				<Row style={{ marginTop: 18 }}>
					<Column
						className="gnd-standard-mobile-stack"
						style={{ width: "56%" }}
					>
						<Text
							className="gnd-standard-muted m-0 text-[12px] font-semibold uppercase tracking-[0.8px]"
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
					</Column>
					<Column
						className="gnd-standard-mobile-stack"
						style={{ width: "44%" }}
					>
						<Text
							className="gnd-standard-muted m-0 text-[12px] font-semibold uppercase tracking-[0.8px]"
							style={{ color: standardEmailColors.muted }}
						>
							Surface
						</Text>
						<Text
							className="gnd-standard-text m-0 mt-[5px] text-[14px] font-semibold"
							style={{ color: standardEmailColors.ink }}
						>
							{formatSurface(appSurface)}
						</Text>
					</Column>
				</Row>

				<Text
					className="gnd-standard-muted m-0 mt-[18px] text-[12px] font-semibold uppercase tracking-[0.8px]"
					style={{ color: standardEmailColors.muted }}
				>
					Session ID
				</Text>
				<Text
					className="gnd-standard-text m-0 mt-[5px] text-[13px] leading-[20px]"
					style={{ color: standardEmailColors.ink, wordBreak: "break-word" }}
				>
					{sessionId}
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
				className="gnd-standard-panel gnd-standard-soft-danger gnd-standard-border mx-[36px] mb-[34px] mt-[18px] rounded-[6px] border border-solid px-[20px] py-[17px]"
				style={{
					backgroundColor: standardEmailColors.softDanger,
					borderColor: standardEmailColors.border,
				}}
			>
				<Text
					className="gnd-standard-danger-text m-0 text-[12px] font-semibold uppercase tracking-[0.8px]"
					style={{ color: standardEmailColors.danger }}
				>
					Monitoring notice
				</Text>
				<Text
					className="gnd-standard-text m-0 mt-[7px] text-[14px] leading-[22px]"
					style={{ color: standardEmailColors.ink }}
				>
					This message is for security monitoring recipients. If this access was
					not expected, contact {supportEmail}.
				</Text>
			</Section>

			<StandardEmailSignature
				department="Privileged access monitoring · GND Millwork"
				senderName="GND Millwork Security"
			/>
		</StandardEmailLayout>
	);
}

AuthMasterPasswordLoginAlertEmail.PreviewProps = {
	accountName: "GND Demo Admin",
	accountEmail: "admin@example.invalid",
	appSurface: "www",
	loginAt: "August 29, 2026 at 10:42 AM WAT",
	ipAddress: "203.0.113.24",
	userAgent: "Chrome 140 on macOS",
	sessionId: "session_preview_01",
	actorLabel: "GND support administrator",
	supportEmail: "support@gndprodesk.com",
} satisfies Props;
