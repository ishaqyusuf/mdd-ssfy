import { ResetPasswordStep2Form } from "@/components/_v1/forms/reset-password-form-step2";
import { AuthResetShell } from "@/components/auth-reset-shell";
import { Icons } from "@gnd/ui/icons";
import type { Metadata } from "next";

import PageShell from "@/components/page-shell";
export const metadata: Metadata = {
	title: "Reset Password | GND",
};
export default async function Page() {
	return (
		<PageShell>
			<AuthResetShell
				eyebrow="Secure link"
				title="Create a new password"
				description="Choose a new password for your account. This reset link can only be used once."
				icon={<Icons.LockKeyhole className="size-5" />}
			>
				<ResetPasswordStep2Form />
			</AuthResetShell>
		</PageShell>
	);
}
