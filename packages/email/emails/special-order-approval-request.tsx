/** @jsxImportSource react */
import { Column, Row, Section, Text } from "@react-email/components";

import {
	StandardEmailButton,
	StandardEmailHeader,
	StandardEmailHero,
	StandardEmailLayout,
	StandardEmailSignature,
	standardEmailColors,
} from "../components/standard-email";

type Props = {
	customerName?: string | null;
	orderNo: string;
	approvalUrl: string;
	expiresAt: string;
};

const formatExpiry = (value: string) =>
	new Date(value).toLocaleString("en-US", {
		dateStyle: "medium",
		timeStyle: "short",
	});

export default function SpecialOrderApprovalRequestEmail({
	customerName,
	orderNo,
	approvalUrl,
	expiresAt,
}: Props) {
	return (
		<StandardEmailLayout previewText={`Review Special Order ${orderNo}`}>
			<StandardEmailHeader
				documentLabel="Approval requested"
				documentMeta={`Order ${orderNo}`}
			/>

			<StandardEmailHero
				eyebrow="Special Order"
				recipientName={customerName || "Customer"}
				title="Your Approval Is Needed"
			>
				<Text
					className="gnd-standard-text m-0 mt-[10px] text-[15px] leading-[24px]"
					style={{ color: standardEmailColors.ink }}
				>
					Please review the complete order details and Special Order policy
					before approving or declining this revision.
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
						style={{ width: "48%" }}
					>
						<Text
							className="gnd-standard-muted m-0 text-[12px] font-semibold uppercase tracking-[0.8px]"
							style={{ color: standardEmailColors.muted }}
						>
							Order
						</Text>
						<Text
							className="gnd-standard-heading m-0 mt-[6px] text-[20px] font-semibold"
							style={{ color: standardEmailColors.cypress }}
						>
							{orderNo}
						</Text>
					</Column>
					<Column
						className="gnd-standard-mobile-stack"
						style={{ width: "52%" }}
					>
						<Text
							className="gnd-standard-muted m-0 text-[12px] font-semibold uppercase tracking-[0.8px]"
							style={{ color: standardEmailColors.muted }}
						>
							Secure link expires
						</Text>
						<Text
							className="gnd-standard-text m-0 mt-[6px] text-[14px] font-semibold leading-[21px]"
							style={{ color: standardEmailColors.ink }}
						>
							{formatExpiry(expiresAt)}
						</Text>
					</Column>
				</Row>
			</Section>

			<Section className="gnd-standard-content px-[36px] pb-[22px] pt-[26px]">
				<StandardEmailButton href={approvalUrl}>
					Review and Sign
				</StandardEmailButton>
			</Section>

			<Section
				className="gnd-standard-panel gnd-standard-border mx-[36px] mb-[34px] rounded-[6px] border border-solid px-[20px] py-[17px]"
				style={{ borderColor: standardEmailColors.border }}
			>
				<Text
					className="gnd-standard-muted m-0 text-[12px] font-semibold uppercase tracking-[0.8px]"
					style={{ color: standardEmailColors.muted }}
				>
					Secure review link
				</Text>
				<Text
					className="gnd-standard-text m-0 mt-[7px] text-[14px] leading-[22px]"
					style={{ color: standardEmailColors.ink }}
				>
					This link can no longer be used after you approve or decline the
					order. If it expires first, reply to this email to request a new one.
				</Text>
			</Section>

			<StandardEmailSignature />
		</StandardEmailLayout>
	);
}

SpecialOrderApprovalRequestEmail.PreviewProps = {
	customerName: "Jordan Lee",
	orderNo: "GND-10482",
	approvalUrl: "https://gndprodesk.com/special-orders/preview/approve",
	expiresAt: "2026-09-05T17:00:00.000Z",
} satisfies Props;
