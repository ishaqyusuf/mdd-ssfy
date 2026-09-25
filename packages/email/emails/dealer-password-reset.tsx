/** @jsxImportSource react */
import {
	DealerEmailActions,
	DealerEmailFrame,
	DealerEmailNote,
	StandardEmailButton,
} from "../components/dealer-email";

interface Props {
	dealerName: string;
	resetLink: string;
	expiresInMinutes?: number | null;
}

export default function DealerPasswordResetEmail({
	dealerName,
	resetLink,
	expiresInMinutes = 60,
}: Props) {
	return (
		<DealerEmailFrame
			description="We received a request to reset your GND dealer portal password. Choose a new password using the secure link below."
			documentLabel="Password reset"
			documentMeta="Dealer portal"
			eyebrow="Account security"
			previewText="Reset your GND dealer portal password"
			recipientName={dealerName}
			title="Reset Your Dealer Portal Password"
		>
			<DealerEmailNote label="Link security">
				This link expires in {expiresInMinutes || 60} minutes. If you did not
				request a password reset, you can safely ignore this email.
			</DealerEmailNote>
			<DealerEmailActions>
				<StandardEmailButton href={resetLink}>
					Reset Password
				</StandardEmailButton>
			</DealerEmailActions>
		</DealerEmailFrame>
	);
}

DealerPasswordResetEmail.PreviewProps = {
	dealerName: "Northside Millwork",
	resetLink: "https://dealership.gndprodesk.com/auth/reset-password/preview",
	expiresInMinutes: 30,
} satisfies Props;
