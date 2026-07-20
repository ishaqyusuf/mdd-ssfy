/** @jsxImportSource react */
import { Heading, Img, Section, Text } from "@react-email/components";
import { Button } from "./theme";

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
			className="my-[22px] overflow-hidden rounded-[12px] p-[20px]"
			style={{ backgroundColor: accentColor }}
		>
			{imageUrl ? (
				<Img
					alt=""
					className="mb-[14px] h-auto w-full rounded-[8px]"
					src={imageUrl}
				/>
			) : null}
			<Heading className="m-0 text-[22px] leading-[28px] text-white">
				{headline}
			</Heading>
			<Text className="mt-[10px] mb-[16px] text-[14px] leading-[22px] text-white">
				{benefitText}
			</Text>
			<Button href={url} variant="secondary">
				{ctaLabel}
			</Button>
		</Section>
	);
}
