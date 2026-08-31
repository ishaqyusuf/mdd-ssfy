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
	salesRepName?: string | null;
	paymentMethod: string;
	totalAmount: number;
	note?: string | null;
	invoicePdfAttachment?: unknown;
	sales: {
		orderNo: string;
		amountApplied?: number | null;
		remainingDue?: number | null;
	}[];
}

const formatCurrency = (value: number) =>
	Intl.NumberFormat("en-US", {
		style: "currency",
		currency: "USD",
	}).format(value || 0);

export function SalesCustomerPaymentReceivedEmail(props: Props) {
	const previewText = `Payment received for order${props.sales.length > 1 ? "s" : ""} ${props.sales.map((sale) => sale.orderNo).join(", ")}`;
	const documentMeta =
		props.sales.length === 1
			? `#${props.sales[0]?.orderNo ?? ""}`
			: `${props.sales.length} orders`;

	return (
		<StandardEmailLayout previewText={previewText}>
			<StandardEmailHeader
				documentLabel="Payment receipt"
				documentMeta={documentMeta}
			/>

			<StandardEmailHero
				eyebrow="Payment confirmation"
				recipientName={props.customerName}
				title="Payment Received"
			>
				<Text
					className="gnd-standard-text m-0 mt-[9px] text-[16px] leading-[25px]"
					style={{ color: standardEmailColors.ink }}
				>
					We received your payment of{" "}
					<strong>{formatCurrency(props.totalAmount)}</strong> via{" "}
					{props.paymentMethod}. The allocation is shown below for your records.
				</Text>
			</StandardEmailHero>

			<Section
				className="gnd-standard-panel gnd-standard-soft-green gnd-standard-border gnd-standard-content mx-[36px] mt-[28px] px-[20px] py-[18px]"
				style={{
					backgroundColor: standardEmailColors.softGreen,
					border: `1px solid ${standardEmailColors.border}`,
					borderRadius: 6,
				}}
			>
				<Row>
					<StandardEmailMetric
						emphasis
						label="Amount received"
						value={formatCurrency(props.totalAmount)}
					/>
					<StandardEmailMetric
						label="Payment method"
						value={props.paymentMethod}
					/>
					<StandardEmailMetric
						label="Orders"
						value={String(props.sales.length)}
					/>
				</Row>
			</Section>

			{props.note ? (
				<Section
					className="gnd-standard-panel gnd-standard-soft gnd-standard-border gnd-standard-content mx-[36px] mt-[24px] px-[18px] py-[16px]"
					style={{
						backgroundColor: standardEmailColors.soft,
						border: `1px solid ${standardEmailColors.border}`,
						borderRadius: 6,
					}}
				>
					<Text
						className="gnd-standard-muted m-0 text-[12px] font-semibold uppercase tracking-[0.9px]"
						style={{ color: standardEmailColors.muted }}
					>
						Payment note
					</Text>
					<Text
						className="gnd-standard-text m-0 mt-[8px] text-[14px] leading-[22px]"
						style={{ color: standardEmailColors.ink }}
					>
						{props.note}
					</Text>
				</Section>
			) : null}

			<Section className="gnd-standard-content px-[36px] py-[30px]">
				<Text
					className="gnd-standard-muted m-0 text-[12px] font-semibold uppercase tracking-[1px]"
					style={{ color: standardEmailColors.muted }}
				>
					Payment allocation
				</Text>
				{props.sales.map((sale, index) => (
					<Section
						key={sale.orderNo}
						className={`${index % 2 ? "gnd-standard-row-alt" : "gnd-standard-row"} gnd-standard-border mt-[10px] px-[16px] py-[15px]`}
						style={{
							backgroundColor:
								index % 2 ? standardEmailColors.soft : standardEmailColors.card,
							border: `1px solid ${standardEmailColors.border}`,
							borderRadius: 6,
						}}
					>
						<Row>
							<Column style={{ verticalAlign: "top", width: "38%" }}>
								<Text
									className="gnd-standard-muted m-0 text-[12px] font-semibold uppercase tracking-[0.7px]"
									style={{ color: standardEmailColors.muted }}
								>
									Order
								</Text>
								<Text
									className="gnd-standard-text m-0 mt-[5px] text-[15px] font-semibold leading-[21px]"
									style={{ color: standardEmailColors.ink }}
								>
									#{sale.orderNo}
								</Text>
							</Column>
							<Column style={{ verticalAlign: "top", width: "31%" }}>
								<Text
									className="gnd-standard-muted m-0 text-[12px] font-semibold uppercase tracking-[0.7px]"
									style={{ color: standardEmailColors.muted }}
								>
									Applied
								</Text>
								<Text
									className="gnd-standard-text m-0 mt-[5px] text-[14px] font-semibold leading-[20px]"
									style={{ color: standardEmailColors.ink }}
								>
									{sale.amountApplied == null
										? "Recorded"
										: formatCurrency(sale.amountApplied)}
								</Text>
							</Column>
							<Column
								align="right"
								style={{ verticalAlign: "top", width: "31%" }}
							>
								<Text
									className="gnd-standard-muted m-0 text-[12px] font-semibold uppercase tracking-[0.7px]"
									style={{ color: standardEmailColors.muted }}
								>
									Balance
								</Text>
								<Text
									className="gnd-standard-text m-0 mt-[5px] text-[14px] font-semibold leading-[20px]"
									style={{ color: standardEmailColors.ink }}
								>
									{formatCurrency(Number(sale.remainingDue || 0))}
								</Text>
							</Column>
						</Row>
					</Section>
				))}

				{props.invoicePdfAttachment ? (
					<Text
						className="gnd-standard-muted m-0 mt-[14px] text-[12px] leading-[19px]"
						style={{ color: standardEmailColors.muted }}
					>
						{props.sales.length > 1
							? "The invoice PDFs are attached for your records."
							: "The invoice PDF is attached for your records."}
					</Text>
				) : null}

				<Text
					className="gnd-standard-text m-0 mt-[20px] text-[14px] leading-[22px]"
					style={{ color: standardEmailColors.ink }}
				>
					If you have questions about this payment or its allocation, reply
					directly to this email.
				</Text>
			</Section>

			<StandardEmailSignature senderName={props.salesRepName} />
		</StandardEmailLayout>
	);
}

SalesCustomerPaymentReceivedEmail.PreviewProps = {
	customerName: "Jordan Lee",
	salesRepName: "Taylor Morgan",
	paymentMethod: "Visa ending in 4242",
	totalAmount: 1240,
	note: "Deposit applied across the two open order balances.",
	invoicePdfAttachment: { preview: true },
	sales: [
		{ orderNo: "GND-10482", amountApplied: 900, remainingDue: 1580 },
		{ orderNo: "GND-10461", amountApplied: 340, remainingDue: 640 },
	],
} satisfies Props;

export default SalesCustomerPaymentReceivedEmail;
