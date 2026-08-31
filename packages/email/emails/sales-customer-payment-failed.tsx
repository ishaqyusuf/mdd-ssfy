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
	paymentMethod?: string | null;
	totalAmount?: number | null;
	reason?: string | null;
	sales: {
		orderNo: string;
		remainingDue?: number | null;
	}[];
	salesRepName?: string | null;
}

const formatCurrency = (value: number) =>
	Intl.NumberFormat("en-US", {
		style: "currency",
		currency: "USD",
	}).format(value || 0);

export function SalesCustomerPaymentFailedEmail(props: Props) {
	const orderLabel = `${props.sales.length} order${props.sales.length === 1 ? "" : "s"}`;
	const previewText = `Payment attempt incomplete for order${props.sales.length > 1 ? "s" : ""} ${props.sales.map((sale) => sale.orderNo).join(", ")}`;

	return (
		<StandardEmailLayout previewText={previewText}>
			<StandardEmailHeader
				documentLabel="Payment update"
				documentMeta={orderLabel}
			/>

			<StandardEmailHero
				eyebrow="Payment issue"
				recipientName={props.customerName}
				title="Payment Could Not Be Processed"
			>
				<Text
					className="gnd-standard-text m-0 mt-[10px] text-[15px] leading-[24px]"
					style={{ color: standardEmailColors.ink }}
				>
					We were unable to complete your recent payment attempt. Your orders
					remain open, and no successful payment was recorded from this attempt.
				</Text>
			</StandardEmailHero>

			<Section
				className="gnd-standard-panel gnd-standard-soft-danger gnd-standard-border mx-[36px] mt-[28px] rounded-[6px] border border-solid p-[20px]"
				style={{
					backgroundColor: standardEmailColors.softDanger,
					borderColor: standardEmailColors.border,
				}}
			>
				<Row>
					<StandardEmailMetric
						emphasis
						label="Attempted amount"
						value={
							props.totalAmount != null
								? formatCurrency(props.totalAmount)
								: "Not available"
						}
					/>
					<StandardEmailMetric
						label="Payment method"
						value={props.paymentMethod || "Not provided"}
					/>
					<StandardEmailMetric label="Affected" value={orderLabel} />
				</Row>
			</Section>

			{props.reason ? (
				<Section
					className="gnd-standard-panel gnd-standard-border mx-[36px] mt-[16px] rounded-[6px] border border-solid px-[20px] py-[17px]"
					style={{ borderColor: standardEmailColors.border }}
				>
					<Text
						className="gnd-standard-danger-text m-0 text-[12px] font-semibold uppercase tracking-[0.9px]"
						style={{ color: standardEmailColors.danger }}
					>
						What happened
					</Text>
					<Text
						className="gnd-standard-text m-0 mt-[7px] text-[14px] leading-[22px]"
						style={{ color: standardEmailColors.ink }}
					>
						{props.reason}
					</Text>
				</Section>
			) : null}

			<Section className="gnd-standard-content px-[36px] pb-[8px] pt-[30px]">
				<Text
					className="gnd-standard-muted m-0 text-[12px] font-semibold uppercase tracking-[1.1px]"
					style={{ color: standardEmailColors.muted }}
				>
					Outstanding balance
				</Text>
			</Section>

			{props.sales.map((sale, index) => (
				<Section
					className={`gnd-standard-panel gnd-standard-border mx-[36px] mt-[10px] rounded-[6px] border border-solid px-[20px] py-[16px] ${index % 2 === 1 ? "gnd-standard-row-alt" : "gnd-standard-row"}`}
					key={sale.orderNo}
					style={{
						backgroundColor:
							index % 2 === 1
								? standardEmailColors.soft
								: standardEmailColors.card,
						borderColor: standardEmailColors.border,
					}}
				>
					<Row>
						<Column
							className="gnd-standard-mobile-stack"
							style={{ width: "55%" }}
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
						</Column>
						<Column
							align="right"
							className="gnd-standard-mobile-stack"
							style={{ width: "45%" }}
						>
							<Text
								className="gnd-standard-muted m-0 text-[12px] uppercase tracking-[0.7px]"
								style={{ color: standardEmailColors.muted }}
							>
								Remaining due
							</Text>
							<Text
								className="gnd-standard-danger-text m-0 mt-[5px] text-[15px] font-semibold"
								style={{ color: standardEmailColors.danger }}
							>
								{formatCurrency(Number(sale.remainingDue || 0))}
							</Text>
						</Column>
					</Row>
				</Section>
			))}

			<Section className="gnd-standard-content px-[36px] pb-[34px] pt-[26px]">
				<Text
					className="gnd-standard-text m-0 text-[14px] leading-[23px]"
					style={{ color: standardEmailColors.ink }}
				>
					Please retry your payment when convenient. If the issue continues,
					reply to this email and our sales team will help you complete it.
				</Text>
			</Section>

			<StandardEmailSignature senderName={props.salesRepName} />
		</StandardEmailLayout>
	);
}

SalesCustomerPaymentFailedEmail.PreviewProps = {
	customerName: "Jordan Lee",
	paymentMethod: "Visa ending in 4242",
	totalAmount: 1240,
	reason: "The card issuer declined the transaction.",
	sales: [
		{ orderNo: "GND-10482", remainingDue: 840 },
		{ orderNo: "GND-10491", remainingDue: 400 },
	],
	salesRepName: "Maya Thompson",
} satisfies Props;

export default SalesCustomerPaymentFailedEmail;
