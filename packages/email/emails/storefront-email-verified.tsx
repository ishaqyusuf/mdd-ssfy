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

interface EmailProps {
	name?: string;
	storeUrl?: string;
}

const baseUrl = process.env.VERCEL_URL
	? `https://${process.env.VERCEL_URL}`
	: "http://localhost:3010";

export const EmailVerifiedEmail = ({
	name = "Valued Customer",
	storeUrl = `${baseUrl}/shop`,
}: EmailProps) => (
	<StandardEmailLayout previewText="Email Verified">
		<StandardEmailHeader
			documentLabel="Account verified"
			documentMeta="GND Store"
		/>
		<StandardEmailHero
			eyebrow="Account access"
			recipientName={name}
			title="Email Verified"
		>
			<Text
				className="gnd-standard-text m-0 mt-[10px] text-[15px] leading-[24px]"
				style={{ color: standardEmailColors.ink }}
			>
				Your email has been successfully verified. You can now log in to your
				account and start shopping.
			</Text>
		</StandardEmailHero>
		<Section className="gnd-standard-content px-[36px] pb-[30px] pt-[24px]">
			<StandardEmailButton href={storeUrl}>Start Shopping</StandardEmailButton>
			<Text
				className="gnd-standard-muted m-0 mt-[18px] text-[12px] leading-[19px]"
				style={{ color: standardEmailColors.muted }}
			>
				If you have any questions, please contact our support team.
			</Text>
		</Section>
		<StandardEmailSignature
			department="Store · GND Millwork"
			senderName="The GND Team"
		/>
	</StandardEmailLayout>
);

export default EmailVerifiedEmail;
