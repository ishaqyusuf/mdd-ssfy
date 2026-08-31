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

type Props = {
	preview: string;
	heading: string;
	recipientName?: string | null;
	message: string;
	actionLabel?: string | null;
	actionUrl?: string | null;
	note?: string | null;
};

export default function DealerProgramStatusEmail({
	preview,
	heading,
	recipientName,
	message,
	actionLabel,
	actionUrl,
	note,
}: Props) {
	return (
		<StandardEmailLayout previewText={preview}>
			<StandardEmailHeader
				documentLabel="GND update"
				documentMeta="Account & orders"
			/>

			<StandardEmailHero
				eyebrow="Status update"
				recipientName={recipientName || "there"}
				title={heading}
			>
				<Text
					className="gnd-standard-text m-0 mt-[10px] text-[15px] leading-[24px]"
					style={{ color: standardEmailColors.ink }}
				>
					{message}
				</Text>
			</StandardEmailHero>

			{note ? (
				<Section
					className="gnd-standard-panel gnd-standard-soft gnd-standard-border gnd-standard-brass-border mx-[36px] mt-[26px] rounded-[6px] border border-solid px-[20px] py-[17px]"
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
						Additional note
					</Text>
					<Text
						className="gnd-standard-text m-0 mt-[7px] text-[14px] leading-[22px]"
						style={{ color: standardEmailColors.ink }}
					>
						{note}
					</Text>
				</Section>
			) : null}

			{actionLabel && actionUrl ? (
				<Section className="gnd-standard-content px-[36px] pb-[34px] pt-[26px]">
					<StandardEmailButton href={actionUrl}>
						{actionLabel}
					</StandardEmailButton>
				</Section>
			) : (
				<Section className="pb-[34px]" />
			)}

			<StandardEmailSignature
				department="Customer operations · GND Millwork"
				senderName="GND Millwork Team"
			/>
		</StandardEmailLayout>
	);
}

DealerProgramStatusEmail.PreviewProps = {
	preview: "Your GND dealer program application was approved",
	heading: "Welcome to the GND Dealer Program",
	recipientName: "Jordan Lee",
	message:
		"Your dealer profile is active. You can now sign in and begin managing orders.",
	actionLabel: "Open dealer portal",
	actionUrl: "https://dealership.gndprodesk.com",
	note: "Reply to this email if you need help getting started.",
} satisfies Props;
