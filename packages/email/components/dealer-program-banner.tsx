/** @jsxImportSource react */
import { Heading, Img, Section, Text } from "@react-email/components";
import { StandardEmailButton, standardEmailColors } from "./standard-email";

export type DealerProgramBannerProps = {
	headline: string;
	benefitText: string;
	ctaLabel: string;
	imageUrl?: string | null;
	accentColor: string;
	url: string;
};

export function DealerProgramBanner({
	headline,
	benefitText,
	ctaLabel,
	imageUrl,
	accentColor,
	url,
}: DealerProgramBannerProps) {
	return (
		<Section
			className="gnd-standard-soft gnd-standard-border my-[22px] overflow-hidden rounded-[6px] border border-solid p-[20px]"
			style={{
				backgroundColor: standardEmailColors.soft,
				borderColor: standardEmailColors.border,
				borderLeft: `4px solid ${accentColor}`,
			}}
		>
			{imageUrl ? (
				<Img
					alt="Dealership partnership"
					className="mb-[16px] h-auto w-full rounded-[5px]"
					src={imageUrl}
				/>
			) : null}
			<Text
				className="gnd-standard-accent-text m-0 text-[11px] font-semibold uppercase tracking-[1.2px]"
				style={{ color: standardEmailColors.cypress }}
			>
				Dealer partnership
			</Text>
			<Heading
				className="gnd-standard-heading m-0 mt-[8px] text-[22px] leading-[28px]"
				style={{
					color: standardEmailColors.ink,
					fontFamily: "Georgia, 'Times New Roman', serif",
				}}
			>
				{headline}
			</Heading>
			<Text
				className="gnd-standard-text mb-[18px] mt-[10px] text-[14px] leading-[22px]"
				style={{ color: standardEmailColors.ink }}
			>
				{benefitText}
			</Text>
			<StandardEmailButton href={url}>{ctaLabel}</StandardEmailButton>
		</Section>
	);
}
