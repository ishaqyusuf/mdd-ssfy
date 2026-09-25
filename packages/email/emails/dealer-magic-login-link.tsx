/** @jsxImportSource react */
import {
	DealerEmailActions,
	DealerEmailFrame,
	DealerEmailNote,
	StandardEmailButton,
} from "../components/dealer-email";

interface Props {
	dealerName: string;
	loginLink: string;
	expiresInMinutes?: number | null;
}

export default function DealerMagicLoginLinkEmail({
	dealerName,
	loginLink,
	expiresInMinutes = 10,
}: Props) {
	return (
		<DealerEmailFrame
			description="Use this secure, one-time link to sign in to your GND dealer portal."
			documentLabel="Secure sign in"
			documentMeta="Dealer portal"
			eyebrow="Account access"
			previewText="Your GND dealer portal login link"
			recipientName={dealerName}
			title="Log In to Your Dealer Portal"
		>
			<DealerEmailNote label="Link security">
				This link expires in {expiresInMinutes || 10} minutes and can only be
				used once. If you did not request this email, you can safely ignore it.
			</DealerEmailNote>
			<DealerEmailActions>
				<StandardEmailButton href={loginLink}>
					Log In to Dealer Portal
				</StandardEmailButton>
			</DealerEmailActions>
		</DealerEmailFrame>
	);
}

DealerMagicLoginLinkEmail.PreviewProps = {
	dealerName: "Northside Millwork",
	loginLink: "https://dealership.gndprodesk.com/auth/magic-link/preview",
	expiresInMinutes: 10,
} satisfies Props;
