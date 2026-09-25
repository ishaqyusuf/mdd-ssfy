/** @jsxImportSource react */
import {
	DealerEmailActions,
	DealerEmailFrame,
	DealerEmailNote,
	StandardEmailButton,
} from "../components/dealer-email";

interface Props {
	dealerName: string;
	onboardingLink: string;
	expiresAt?: string | null;
}

export default function DealerOnboardingEmail({
	dealerName,
	onboardingLink,
	expiresAt,
}: Props) {
	const formattedExpiry = expiresAt
		? new Intl.DateTimeFormat("en", {
				month: "short",
				day: "numeric",
				year: "numeric",
			}).format(new Date(expiresAt))
		: null;

	return (
		<DealerEmailFrame
			description="Your GND dealer account is ready. Create your password to finish setup and start using the dealer portal."
			documentLabel="Account setup"
			documentMeta="Dealer portal"
			eyebrow="Welcome to GND"
			previewText="Set up your GND dealer account"
			recipientName={dealerName}
			title="Set Up Your Dealer Account"
		>
			{formattedExpiry ? (
				<DealerEmailNote label="Secure setup link">
					This setup link expires on {formattedExpiry}.
				</DealerEmailNote>
			) : null}
			<DealerEmailActions>
				<StandardEmailButton href={onboardingLink}>
					Set Up Dealer Account
				</StandardEmailButton>
			</DealerEmailActions>
		</DealerEmailFrame>
	);
}

DealerOnboardingEmail.PreviewProps = {
	dealerName: "Northside Millwork",
	onboardingLink: "https://dealership.gndprodesk.com/onboarding/preview",
	expiresAt: "September 5, 2026",
} satisfies Props;
