/** @jsxImportSource react */

import { Column, Row, Section, Text } from "@react-email/components";

import {
	StandardEmailHeader,
	StandardEmailHero,
	StandardEmailLayout,
	StandardEmailSignature,
	standardEmailColors,
} from "../components/standard-email";

type Props = {
	name?: string;
	reference?: string;
	projectSummary?: string;
};

export default function StorefrontCustomInquiryReceived({
	name = "Jordan Lee",
	reference = "CMW-ABC123",
	projectSummary = "Built-in library and media wall",
}: Props) {
	return (
		<StandardEmailLayout previewText="We received your custom millwork request">
			<StandardEmailHeader
				documentLabel="Request received"
				documentMeta={reference}
			/>

			<StandardEmailHero
				eyebrow="Custom millwork"
				recipientName={name}
				title="Your Project Request Is with Our Team"
			>
				<Text
					className="gnd-standard-text m-0 mt-[10px] text-[15px] leading-[24px]"
					style={{ color: standardEmailColors.ink }}
				>
					We received your custom millwork brief. An office team member will
					review the scope and follow up if we need measurements, material
					details, or other information before preparing a quote.
				</Text>
			</StandardEmailHero>

			<Section
				className="gnd-standard-panel gnd-standard-soft-green gnd-standard-border mx-[36px] mt-[28px] rounded-[6px] border border-solid px-[20px] py-[19px]"
				style={{
					backgroundColor: standardEmailColors.softGreen,
					borderColor: standardEmailColors.border,
				}}
			>
				<Row>
					<Column
						className="gnd-standard-mobile-stack"
						style={{ width: "42%" }}
					>
						<Text
							className="gnd-standard-muted m-0 text-[12px] font-semibold uppercase tracking-[0.8px]"
							style={{ color: standardEmailColors.muted }}
						>
							Reference
						</Text>
						<Text
							className="gnd-standard-heading m-0 mt-[6px] text-[19px] font-semibold"
							style={{ color: standardEmailColors.cypress }}
						>
							{reference}
						</Text>
					</Column>
					<Column
						className="gnd-standard-mobile-stack"
						style={{ width: "58%" }}
					>
						<Text
							className="gnd-standard-muted m-0 text-[12px] font-semibold uppercase tracking-[0.8px]"
							style={{ color: standardEmailColors.muted }}
						>
							Project
						</Text>
						<Text
							className="gnd-standard-text m-0 mt-[6px] text-[14px] font-semibold leading-[21px]"
							style={{ color: standardEmailColors.ink }}
						>
							{projectSummary}
						</Text>
					</Column>
				</Row>
			</Section>

			<Section
				className="gnd-standard-panel gnd-standard-soft gnd-standard-border gnd-standard-brass-border mx-[36px] mb-[34px] mt-[18px] rounded-[6px] border border-solid px-[20px] py-[17px]"
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
					For your records
				</Text>
				<Text
					className="gnd-standard-text m-0 mt-[7px] text-[14px] leading-[22px]"
					style={{ color: standardEmailColors.ink }}
				>
					This confirmation is not a quote or order. Keep the reference above if
					you contact us about the request.
				</Text>
			</Section>

			<StandardEmailSignature
				department="Custom projects · GND Millwork"
				senderName="GND Millwork Project Team"
			/>
		</StandardEmailLayout>
	);
}
