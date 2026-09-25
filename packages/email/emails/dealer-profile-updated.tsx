/** @jsxImportSource react */
import {
	DealerEmailActions,
	DealerEmailDetails,
	DealerEmailFrame,
	DealerEmailNote,
	StandardEmailButton,
} from "../components/dealer-email";

interface Props {
	dealerName: string;
	previousProfileName?: string | null;
	newProfileName: string;
	effectiveAt: string;
	dealershipUrl?: string | null;
}

function formatDate(value: string) {
	return new Intl.DateTimeFormat("en", {
		month: "short",
		day: "numeric",
		year: "numeric",
	}).format(new Date(value));
}

export default function DealerProfileUpdatedEmail({
	dealerName,
	previousProfileName,
	newProfileName,
	effectiveAt,
	dealershipUrl,
}: Props) {
	const assigned = !previousProfileName;
	const previewText = assigned
		? "Your GND dealership profile has been assigned"
		: "Your GND dealership profile has been updated";

	return (
		<DealerEmailFrame
			description={
				assigned
					? "Your dealership profile has been assigned. It applies to new quotes and account pricing from the date below."
					: "Your dealership profile has been updated. It applies to new quotes and account pricing from the date below."
			}
			documentLabel={assigned ? "Profile assigned" : "Profile updated"}
			documentMeta="Dealer account"
			eyebrow="Account pricing"
			previewText={previewText}
			recipientName={dealerName}
			title={
				assigned ? "Dealership Profile Assigned" : "Dealership Profile Updated"
			}
		>
			<DealerEmailDetails
				items={[
					...(previousProfileName
						? [{ label: "Previous profile", value: previousProfileName }]
						: []),
					{ label: "Current profile", value: newProfileName },
					{ label: "Effective", value: formatDate(effectiveAt) },
				]}
			/>
			<DealerEmailNote label="Saved quotes">
				Existing saved quotes keep their saved pricing unless you explicitly
				refresh pricing on that quote.
			</DealerEmailNote>
			<DealerEmailActions>
				{dealershipUrl ? (
					<StandardEmailButton href={dealershipUrl}>
						View Dealer Account
					</StandardEmailButton>
				) : null}
			</DealerEmailActions>
		</DealerEmailFrame>
	);
}

DealerProfileUpdatedEmail.PreviewProps = {
	dealerName: "Northside Millwork",
	previousProfileName: "Standard Dealer",
	newProfileName: "Preferred Dealer",
	effectiveAt: "2026-08-29T10:42:00.000Z",
	dealershipUrl: "https://dealership.gndprodesk.com",
} satisfies Props;
