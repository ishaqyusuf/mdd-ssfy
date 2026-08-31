/** @jsxImportSource react */
import { Section, Text } from "@react-email/components";

import {
	StandardEmailHeader,
	StandardEmailHero,
	StandardEmailLayout,
	StandardEmailSignature,
	standardEmailColors,
} from "../components/standard-email";

type Props = {
	preview: string;
	recipientName: string;
	headline: string;
	orderNo: string;
	message: string;
};

export default function SpecialOrderStatusNotificationEmail({
	preview,
	recipientName,
	headline,
	orderNo,
	message,
}: Props) {
	return (
		<StandardEmailLayout previewText={preview}>
			<StandardEmailHeader
				documentLabel="Status update"
				documentMeta={`Order ${orderNo}`}
			/>

			<StandardEmailHero
				eyebrow="Special Order"
				recipientName={recipientName}
				title={headline}
			>
				<Text
					className="gnd-standard-text m-0 mt-[10px] text-[15px] leading-[24px]"
					style={{ color: standardEmailColors.ink }}
				>
					There is a new update on your Special Order. The latest status and
					next step are summarized below.
				</Text>
			</StandardEmailHero>

			<Section
				className="gnd-standard-panel gnd-standard-soft gnd-standard-border gnd-standard-brass-border mx-[36px] mb-[34px] mt-[28px] rounded-[6px] border border-solid px-[20px] py-[20px]"
				style={{
					backgroundColor: standardEmailColors.soft,
					borderColor: standardEmailColors.border,
					borderLeft: `4px solid ${standardEmailColors.brass}`,
				}}
			>
				<Text
					className="gnd-standard-muted m-0 text-[12px] font-semibold uppercase tracking-[0.9px]"
					style={{ color: standardEmailColors.muted }}
				>
					Order {orderNo} · What this means
				</Text>
				<Text
					className="gnd-standard-text m-0 mt-[9px] text-[15px] leading-[24px]"
					style={{ color: standardEmailColors.ink }}
				>
					{message}
				</Text>
			</Section>

			<StandardEmailSignature />
		</StandardEmailLayout>
	);
}

SpecialOrderStatusNotificationEmail.PreviewProps = {
	preview: "Your Special Order is ready for production",
	recipientName: "Jordan Lee",
	headline: "Special Order Approved",
	orderNo: "GND-10482",
	message:
		"We received your approval and will notify you again when production begins.",
} satisfies Props;
