/** @jsxImportSource react */
import {
	DealerEmailActions,
	DealerEmailDetails,
	DealerEmailFrame,
	DealerEmailNote,
	StandardEmailButton,
} from "../components/dealer-email";

interface Props {
	recipientName?: string | null;
	dealerName: string;
	quoteNo: string;
	customerName?: string | null;
	requestedAt: string;
	requestUrl: string;
}

function formatRequestedAt(value: string) {
	const date = new Date(value);
	return Number.isNaN(date.getTime())
		? value
		: new Intl.DateTimeFormat("en-US", {
				dateStyle: "medium",
				timeStyle: "short",
			}).format(date);
}

export default function DealerSalesRequestEmail({
	recipientName,
	dealerName,
	quoteNo,
	customerName,
	requestedAt,
	requestUrl,
}: Props) {
	return (
		<DealerEmailFrame
			description={`${dealerName} requested approval to make quote ${quoteNo} an order.`}
			documentLabel="Review requested"
			documentMeta={quoteNo}
			eyebrow="Dealer order request"
			previewText={`${dealerName} requested approval for ${quoteNo}`}
			recipientName={recipientName || "Sales Team"}
			title="Review This Dealer Order Request"
		>
			<DealerEmailDetails
				items={[
					{ label: "Dealer", value: dealerName },
					{ label: "Quote", value: quoteNo },
					...(customerName ? [{ label: "Customer", value: customerName }] : []),
					{ label: "Requested", value: formatRequestedAt(requestedAt) },
				]}
			/>
			<DealerEmailNote label="Before you decide">
				Review the quote, complete any missing details, and approve or reject
				the request from GND Prodesk.
			</DealerEmailNote>
			<DealerEmailActions>
				<StandardEmailButton href={requestUrl}>
					Review Request
				</StandardEmailButton>
			</DealerEmailActions>
		</DealerEmailFrame>
	);
}

DealerSalesRequestEmail.PreviewProps = {
	recipientName: "Sales Team",
	dealerName: "Northside Millwork",
	quoteNo: "Q-10482",
	customerName: "Jordan Lee",
	requestedAt: "August 29, 2026 at 10:42 AM WAT",
	requestUrl: "https://gndprodesk.com/dealer-requests/preview",
} satisfies Props;
