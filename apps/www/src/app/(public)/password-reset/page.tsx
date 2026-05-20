import { ResetPasswordForm } from "@/components/_v1/forms/reset-password-form";
import { AuthResetShell } from "@/components/auth-reset-shell";
import { Icons } from "@gnd/ui/icons";
import type { Metadata } from "next";

import PageShell from "@/components/page-shell";

export const metadata: Metadata = {
	title: "Password Reset | GND",
};

export default async function Page() {
	return (
		<PageShell>
			<AuthResetShell
				eyebrow="Password reset"
				title="Reset your password"
				description="Enter the email tied to your GND account. If it exists, we will send a secure one-time link."
				icon={<Icons.Mail className="size-5" />}
			>
				<ResetPasswordForm />
			</AuthResetShell>
		</PageShell>
	);
}
