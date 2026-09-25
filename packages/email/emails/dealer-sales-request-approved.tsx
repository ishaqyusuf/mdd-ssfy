/** @jsxImportSource react */
import { Section } from "@react-email/components";

import {
	DealerEmailActions,
	DealerEmailDetails,
	DealerEmailFrame,
	DealerEmailNote,
	StandardEmailButton,
} from "../components/dealer-email";

interface Props {
	dealerName: string;
	quoteNo: string;
	orderNo?: string | null;
	customerName?: string | null;
	total?: number | null;
	orderUrl?: string | null;
	paymentUrl?: string | null;
}

function currency(value?: number | null) {
	return new Intl.NumberFormat("en-US", {
		style: "currency",
		currency: "USD",
	}).format(Number(value || 0));
}

export default function DealerSalesRequestApprovedEmail({
	dealerName,
	quoteNo,
	orderNo,
	customerName,
	total,
	orderUrl,
	paymentUrl,
}: Props) {
	return (
		<DealerEmailFrame
			description={`Your request to make quote ${quoteNo} an order has been approved.`}
			documentLabel="Request approved"
			documentMeta={orderNo || quoteNo}
			eyebrow="Dealer order request"
			previewText={`Quote ${quoteNo} was approved`}
			recipientName={dealerName}
			title="Your Order Request Was Approved"
		>
			<DealerEmailDetails
				items={[
					{ label: "Quote", value: quoteNo },
					...(orderNo ? [{ label: "Order", value: orderNo }] : []),
					...(customerName ? [{ label: "Customer", value: customerName }] : []),
					...(typeof total === "number"
						? [{ label: "Total", value: currency(total) }]
						: []),
				]}
			/>
			<DealerEmailNote label="Next step">
				You can review the order from your dealer portal.
			</DealerEmailNote>
			<DealerEmailActions>
				{paymentUrl ? (
					<StandardEmailButton href={paymentUrl}>
						Make Payment
					</StandardEmailButton>
				) : null}
				{orderUrl ? (
					<Section className={paymentUrl ? "mt-[12px]" : ""}>
						<StandardEmailButton
							href={orderUrl}
							variant={paymentUrl ? "secondary" : "primary"}
						>
							View Order
						</StandardEmailButton>
					</Section>
				) : null}
			</DealerEmailActions>
		</DealerEmailFrame>
	);
}

DealerSalesRequestApprovedEmail.PreviewProps = {
	dealerName: "Northside Millwork",
	quoteNo: "Q-10482",
	orderNo: "GND-10482",
	customerName: "Jordan Lee",
	total: 2480,
	orderUrl: "https://dealership.gndprodesk.com/orders/preview",
	paymentUrl: "https://gndprodesk.com/pay/preview",
} satisfies Props;
