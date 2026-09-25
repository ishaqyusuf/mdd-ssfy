/** @jsxImportSource react */
import {
	DealerEmailActions,
	DealerEmailDetails,
	DealerEmailFrame,
	DealerEmailNote,
} from "../components/dealer-email";

interface Props {
	dealerName: string;
	quoteNo: string;
	customerName?: string | null;
	reason?: string | null;
}

export default function DealerSalesRequestRejectedEmail({
	dealerName,
	quoteNo,
	customerName,
	reason,
}: Props) {
	return (
		<DealerEmailFrame
			description={`Your request to make quote ${quoteNo}${customerName ? ` for ${customerName}` : ""} an order was not approved yet.`}
			documentLabel="Request declined"
			documentMeta={quoteNo}
			eyebrow="Dealer order request"
			previewText={`Quote ${quoteNo} needs review`}
			recipientName={dealerName}
			title="Order Request Not Approved"
		>
			<DealerEmailDetails
				items={[
					{ label: "Quote", value: quoteNo },
					...(customerName ? [{ label: "Customer", value: customerName }] : []),
				]}
			/>
			{reason ? (
				<DealerEmailNote label="Review note">{reason}</DealerEmailNote>
			) : null}
			<DealerEmailNote label="What to do next">
				Please contact your sales rep if you need help updating the quote.
			</DealerEmailNote>
			<DealerEmailActions />
		</DealerEmailFrame>
	);
}

DealerSalesRequestRejectedEmail.PreviewProps = {
	dealerName: "Northside Millwork",
	quoteNo: "Q-10482",
	customerName: "Jordan Lee",
	reason:
		"The quote needs an updated delivery address before it can be approved.",
} satisfies Props;
