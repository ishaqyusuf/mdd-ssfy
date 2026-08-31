/** @jsxImportSource react */
import { Section, Text } from "@react-email/components";

import {
	StandardEmailButton,
	StandardEmailHeader,
	StandardEmailHero,
	StandardEmailLayout,
	StandardEmailSignature,
	standardEmailColors,
} from "../components/standard-email";

interface Props {
	name: string;
	resetLink: string;
}

export default function StorefrontPasswordResetRequest({
	name = "Jordan Lee",
	resetLink = "https://gndprodesk.com/reset-password/preview",
}: Props) {
	return (
		<StandardEmailLayout previewText="Reset your GND Millwork password">
			<StandardEmailHeader
				documentLabel="Account security"
				documentMeta="Password reset"
			/>

			<StandardEmailHero
				eyebrow="Secure account access"
				recipientName={name}
				title="Reset Your Password"
			>
				<Text
					className="gnd-standard-text m-0 mt-[10px] text-[15px] leading-[24px]"
					style={{ color: standardEmailColors.ink }}
				>
					We received a request to reset the password for your GND Millwork
					account. Use the secure link below to choose a new password.
				</Text>
			</StandardEmailHero>

			<Section className="gnd-standard-content px-[36px] pb-[24px] pt-[26px]">
				<StandardEmailButton href={resetLink}>
					Reset password
				</StandardEmailButton>
			</Section>

			<Section
				className="gnd-standard-panel gnd-standard-soft gnd-standard-border gnd-standard-brass-border mx-[36px] mb-[34px] rounded-[6px] border border-solid px-[20px] py-[17px]"
				style={{
					backgroundColor: standardEmailColors.soft,
					borderColor: standardEmailColors.border,
					borderLeft: `4px solid ${standardEmailColors.brass}`,
				}}
			>
				<Text
					className="gnd-standard-muted m-0 text-[12px] font-semibold uppercase tracking-[0.8px]"
					style={{ color: standardEmailColors.muted }}
				>
					Link expires in 1 hour
				</Text>
				<Text
					className="gnd-standard-text m-0 mt-[7px] text-[14px] leading-[22px]"
					style={{ color: standardEmailColors.ink }}
				>
					If you did not request a password reset, ignore this email or contact
					our support team.
				</Text>
			</Section>

			<StandardEmailSignature
				department="Account support · GND Millwork"
				senderName="GND Millwork Support"
			/>
		</StandardEmailLayout>
	);
}
