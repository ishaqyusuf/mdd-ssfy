/** @jsxImportSource react */
import { Column, Row, Section, Text } from "@react-email/components";

import {
	StandardEmailHeader,
	StandardEmailHero,
	StandardEmailLayout,
	StandardEmailMetric,
	StandardEmailSignature,
	standardEmailColors,
} from "../components/standard-email";

interface Props {
	customerName: string;
	refundId: string;
	totalAmount: number;
	reason?: string | null;
	sales: { orderNo: string }[];
	salesRepName?: string | null;
}

const currency = (value: number) =>
	Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(
		value || 0,
	);

export function SalesCustomerRefundCompletedEmail(props: Props) {
	const orderLabel = `${props.sales.length} order${props.sales.length === 1 ? "" : "s"}`;

	return (
		<StandardEmailLayout
			previewText={`Your ${currency(props.totalAmount)} refund is complete`}
		>
			<StandardEmailHeader
				documentLabel="Refund confirmation"
				documentMeta={props.refundId}
			/>

			<StandardEmailHero
				eyebrow="Refund completed"
				recipientName={props.customerName}
				title="Your Refund Is Complete"
			>
				<Text
					className="gnd-standard-text m-0 mt-[10px] text-[15px] leading-[24px]"
					style={{ color: standardEmailColors.ink }}
				>
					Square has completed your refund. We have included the reference and
					related order details below for your records.
				</Text>
			</StandardEmailHero>

			<Section
				className="gnd-standard-panel gnd-standard-soft-green gnd-standard-border mx-[36px] mt-[28px] rounded-[6px] border border-solid p-[20px]"
				style={{
					backgroundColor: standardEmailColors.softGreen,
					borderColor: standardEmailColors.border,
				}}
			>
				<Row>
					<StandardEmailMetric
						emphasis
						label="Refund amount"
						value={currency(props.totalAmount)}
					/>
					<StandardEmailMetric label="Status" value="Completed" />
					<StandardEmailMetric label="Applied to" value={orderLabel} />
				</Row>
			</Section>

			<Section
				className="gnd-standard-panel gnd-standard-border mx-[36px] mt-[16px] rounded-[6px] border border-solid px-[20px] py-[18px]"
				style={{ borderColor: standardEmailColors.border }}
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
							Refund reference
						</Text>
						<Text
							className="gnd-standard-text m-0 mt-[6px] text-[14px] font-semibold leading-[21px]"
							style={{ color: standardEmailColors.ink }}
						>
							{props.refundId}
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
							Bank processing
						</Text>
						<Text
							className="gnd-standard-text m-0 mt-[6px] text-[14px] font-semibold leading-[21px]"
							style={{ color: standardEmailColors.ink }}
						>
							Allow 7–10 business days
						</Text>
					</Column>
				</Row>
			</Section>

			{props.reason ? (
				<Section className="gnd-standard-content px-[36px] pt-[24px]">
					<Text
						className="gnd-standard-muted m-0 text-[12px] font-semibold uppercase tracking-[0.8px]"
						style={{ color: standardEmailColors.muted }}
					>
						Refund reason
					</Text>
					<Text
						className="gnd-standard-text m-0 mt-[6px] text-[14px] leading-[22px]"
						style={{ color: standardEmailColors.ink }}
					>
						{props.reason}
					</Text>
				</Section>
			) : null}

			<Section className="gnd-standard-content px-[36px] pb-[8px] pt-[28px]">
				<Text
					className="gnd-standard-muted m-0 text-[12px] font-semibold uppercase tracking-[1.1px]"
					style={{ color: standardEmailColors.muted }}
				>
					Related orders
				</Text>
			</Section>

			{props.sales.map((sale, index) => (
				<Section
					className={`gnd-standard-panel gnd-standard-border mx-[36px] mt-[10px] rounded-[6px] border border-solid px-[20px] py-[15px] ${index % 2 === 1 ? "gnd-standard-row-alt" : "gnd-standard-row"}`}
					key={sale.orderNo}
					style={{
						backgroundColor:
							index % 2 === 1
								? standardEmailColors.soft
								: standardEmailColors.card,
						borderColor: standardEmailColors.border,
					}}
				>
					<Text
						className="gnd-standard-muted m-0 text-[12px] uppercase tracking-[0.7px]"
						style={{ color: standardEmailColors.muted }}
					>
						Order
					</Text>
					<Text
						className="gnd-standard-text m-0 mt-[5px] text-[15px] font-semibold"
						style={{ color: standardEmailColors.ink }}
					>
						{sale.orderNo}
					</Text>
				</Section>
			))}

			<Section className="gnd-standard-content px-[36px] pb-[34px] pt-[24px]">
				<Text
					className="gnd-standard-text m-0 text-[14px] leading-[23px]"
					style={{ color: standardEmailColors.ink }}
				>
					The time it takes for the credit to appear is controlled by your bank
					after Square completes the refund. Reply to this email if you need
					help locating it.
				</Text>
			</Section>

			<StandardEmailSignature senderName={props.salesRepName} />
		</StandardEmailLayout>
	);
}

SalesCustomerRefundCompletedEmail.PreviewProps = {
	customerName: "Jordan Lee",
	refundId: "RFND-PREVIEW-10482",
	totalAmount: 320,
	reason: "Returned item credit",
	sales: [{ orderNo: "GND-10482" }, { orderNo: "GND-10491" }],
	salesRepName: "Maya Thompson",
} satisfies Props;

export default SalesCustomerRefundCompletedEmail;
