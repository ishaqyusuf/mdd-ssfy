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
	customerName: string;
	loginLink: string;
	revokeLink?: string | null;
}

const LoginEmail = ({ customerName, loginLink, revokeLink }: Props) => (
	<StandardEmailLayout previewText="Your GND Millwork login link">
		<StandardEmailHeader
			documentLabel="Account security"
			documentMeta="Secure sign-in"
		/>

		<StandardEmailHero
			eyebrow="Passwordless access"
			recipientName={customerName}
			title="Log In to GND Millwork"
		>
			<Text
				className="gnd-standard-text m-0 mt-[10px] text-[15px] leading-[24px]"
				style={{ color: standardEmailColors.ink }}
			>
				Use the secure button below to log in to your account. This link will
				expire shortly for your security.
			</Text>
		</StandardEmailHero>

		<Section className="gnd-standard-content px-[36px] pb-[24px] pt-[26px]">
			<StandardEmailButton href={loginLink}>Log in now</StandardEmailButton>
		</Section>

		<Section
			className={`gnd-standard-panel gnd-standard-border gnd-standard-brass-border mx-[36px] mb-[34px] rounded-[6px] border border-solid px-[20px] py-[17px] ${revokeLink ? "gnd-standard-soft-danger" : "gnd-standard-soft"}`}
			style={{
				backgroundColor: revokeLink
					? standardEmailColors.softDanger
					: standardEmailColors.soft,
				borderColor: standardEmailColors.border,
				borderLeft: `4px solid ${standardEmailColors.brass}`,
			}}
		>
			<Text
				className="gnd-standard-muted m-0 text-[12px] font-semibold uppercase tracking-[0.8px]"
				style={{ color: standardEmailColors.muted }}
			>
				Did not request this?
			</Text>
			<Text
				className="gnd-standard-text m-0 mt-[7px] text-[14px] leading-[22px]"
				style={{ color: standardEmailColors.ink }}
			>
				{revokeLink
					? "Destroy this request to prevent unauthorized access."
					: "You can safely ignore this email."}
			</Text>
			{revokeLink ? (
				<Section className="mt-[15px]">
					<StandardEmailButton href={revokeLink} variant="danger">
						Destroy this request
					</StandardEmailButton>
				</Section>
			) : null}
		</Section>

		<StandardEmailSignature
			department="Account support · GND Millwork"
			senderName="GND Millwork Support"
		/>
	</StandardEmailLayout>
);

LoginEmail.PreviewProps = {
	customerName: "Jordan Lee",
	loginLink: "https://gndprodesk.com/auth/login-link/preview",
	revokeLink: "https://gndprodesk.com/auth/login-link/preview/revoke",
} satisfies Props;

export default LoginEmail;
