/** @jsxImportSource react */
import { Img, Section, Text } from "@react-email/components";

import {
	DealerEmailActions,
	DealerEmailFrame,
	StandardEmailButton,
} from "../components/dealer-email";
import { standardEmailColors } from "../components/standard-email";

type Props = {
	recipientName: string;
	headline: string;
	benefitText: string;
	ctaLabel: string;
	invitationUrl: string;
	imageUrl?: string | null;
	accentColor?: string | null;
};

export default function DealerPartnershipInvitationEmail({
	recipientName,
	headline,
	benefitText,
	ctaLabel,
	invitationUrl,
	imageUrl,
	accentColor = standardEmailColors.cypress,
}: Props) {
	return (
		<DealerEmailFrame
			description={benefitText}
			documentLabel="Invitation"
			documentMeta="Dealer partnership"
			eyebrow="Grow with GND"
			previewText={headline}
			recipientName={recipientName}
			title={headline}
		>
			{imageUrl ? (
				<Section className="gnd-standard-content px-[36px] pt-[26px]">
					<Img
						alt="Dealership partnership"
						src={imageUrl}
						style={{
							borderRadius: 6,
							display: "block",
							height: "auto",
							maxWidth: "100%",
						}}
						width="568"
					/>
				</Section>
			) : null}
			<Section
				className="gnd-standard-panel gnd-standard-soft gnd-standard-border mx-[36px] mt-[26px] rounded-[6px] border border-solid px-[20px] py-[17px]"
				style={{
					backgroundColor: standardEmailColors.soft,
					borderColor: standardEmailColors.border,
					borderLeft: `4px solid ${accentColor || standardEmailColors.cypress}`,
				}}
			>
				<Text
					className="gnd-standard-muted m-0 text-[11px] font-semibold uppercase tracking-[0.9px]"
					style={{ color: standardEmailColors.muted }}
				>
					Your invitation
				</Text>
				<Text
					className="gnd-standard-text m-0 mt-[7px] text-[14px] leading-[22px]"
					style={{ color: standardEmailColors.ink }}
				>
					This secure invitation expires in 30 days. Open it to review the
					customer information we have on file and request partnership.
				</Text>
			</Section>
			<DealerEmailActions>
				<StandardEmailButton href={invitationUrl}>
					{ctaLabel}
				</StandardEmailButton>
			</DealerEmailActions>
		</DealerEmailFrame>
	);
}

DealerPartnershipInvitationEmail.PreviewProps = {
	recipientName: "Jordan Lee",
	headline: "Grow your business with GND",
	benefitText:
		"Join the GND dealer program for preferred pricing, sales tools, and dedicated support.",
	ctaLabel: "Review partnership invitation",
	invitationUrl: "https://dealership.gndprodesk.com/invitations/preview",
	imageUrl: null,
	accentColor: "#1f5b4d",
} satisfies Props;
