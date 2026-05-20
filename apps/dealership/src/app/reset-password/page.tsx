import { DealerAuthLayout } from "@/components/dealer-auth-layout";
import { DealerResetPasswordForm } from "./form";

type Props = {
	searchParams: Promise<{
		token?: string;
		error?: string;
	}>;
};

export default async function DealerResetPasswordPage({ searchParams }: Props) {
	const params = await searchParams;
	const token = params.token || null;
	const hasLinkError = Boolean(params.error);

	return (
		<DealerAuthLayout
			description={
				hasLinkError
					? "This reset link is no longer valid. Return to login and request a fresh password reset email."
					: "Choose a new password for your verified dealer portal account."
			}
			eyebrow={hasLinkError ? "Reset link unavailable" : "Password reset"}
			state={hasLinkError ? "error" : "default"}
			title={hasLinkError ? "Request a fresh link" : "Create a new password"}
		>
			<DealerResetPasswordForm token={hasLinkError ? null : token} />
		</DealerAuthLayout>
	);
}
