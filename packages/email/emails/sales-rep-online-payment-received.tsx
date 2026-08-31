/** @jsxImportSource react */
import { Section, Text } from "@react-email/components";

import { formatCurrency } from "@gnd/utils/format";
import {
	StandardEmailHeader,
	StandardEmailHero,
	StandardEmailLayout,
	StandardEmailMetric,
	StandardEmailSignature,
	standardEmailColors,
} from "../components/standard-email";

interface Props {
	ordersNo: string[];
	amount: number;
	repName: string;
	customerName: string;
}

export function SalesRepOnlinePaymentReceived({
	ordersNo = ["GND-10482"],
	amount = 1240,
	repName = "Alex Morgan",
	customerName = "Jordan Lee",
}: Props) {
	const orderLabel = `${ordersNo.length} order${ordersNo.length === 1 ? "" : "s"}`;
	const previewText = `Payment received for order${ordersNo.length > 1 ? "s" : ""} ${ordersNo.join(", ")}`;

	return (
		<StandardEmailLayout previewText={previewText}>
			<StandardEmailHeader
				documentLabel="Payment received"
				documentMeta={orderLabel}
			/>

			<StandardEmailHero
				eyebrow="Online payment"
				recipientName={repName}
				title="Customer Payment Received"
			>
				<Text
					className="gnd-standard-text m-0 mt-[10px] text-[15px] leading-[24px]"
					style={{ color: standardEmailColors.ink }}
				>
					A customer payment has been recorded for your sales orders. Review the
					summary below and verify the transaction in the sales dashboard.
				</Text>
			</StandardEmailHero>

			<Section
				className="gnd-standard-panel gnd-standard-soft-green gnd-standard-border mx-[36px] mt-[28px] rounded-[6px] border border-solid p-[20px]"
				style={{
					backgroundColor: standardEmailColors.softGreen,
					borderColor: standardEmailColors.border,
				}}
			>
				<table cellPadding="0" cellSpacing="0" style={{ width: "100%" }}>
					<tbody>
						<tr>
							<StandardEmailMetric
								emphasis
								label="Amount received"
								value={formatCurrency.format(amount)}
							/>
							<StandardEmailMetric
								label="Customer"
								value={customerName || "Not provided"}
							/>
							<StandardEmailMetric label="Applied to" value={orderLabel} />
						</tr>
					</tbody>
				</table>
			</Section>

			<Section className="gnd-standard-content px-[36px] pb-[8px] pt-[30px]">
				<Text
					className="gnd-standard-muted m-0 text-[12px] font-semibold uppercase tracking-[1.1px]"
					style={{ color: standardEmailColors.muted }}
				>
					Affected orders
				</Text>
			</Section>

			{ordersNo.map((orderNo, index) => (
				<Section
					className={`gnd-standard-panel gnd-standard-border mx-[36px] mt-[10px] rounded-[6px] border border-solid px-[20px] py-[15px] ${index % 2 === 1 ? "gnd-standard-row-alt" : "gnd-standard-row"}`}
					key={orderNo}
					style={{
						backgroundColor:
							index % 2 === 1
								? standardEmailColors.soft
								: standardEmailColors.card,
						borderColor: standardEmailColors.border,
					}}
				>
					<Text
						className="gnd-standard-text m-0 text-[15px] font-semibold"
						style={{ color: standardEmailColors.ink }}
					>
						{orderNo}
					</Text>
				</Section>
			))}

			<Section className="gnd-standard-content px-[36px] pb-[34px] pt-[24px]">
				<Text
					className="gnd-standard-text m-0 text-[14px] leading-[23px]"
					style={{ color: standardEmailColors.ink }}
				>
					This message confirms receipt only. Use the sales dashboard as the
					source of truth for allocation and order-balance details.
				</Text>
			</Section>

			<StandardEmailSignature
				department="Payment operations · GND Millwork"
				senderName="GND Millwork Payments"
			/>
		</StandardEmailLayout>
	);
}

SalesRepOnlinePaymentReceived.PreviewProps = {
	ordersNo: ["GND-10482", "GND-10491"],
	amount: 1240,
	repName: "Alex Morgan",
	customerName: "Jordan Lee",
} satisfies Props;

export default SalesRepOnlinePaymentReceived;
