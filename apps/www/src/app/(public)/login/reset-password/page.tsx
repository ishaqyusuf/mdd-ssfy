import { ResetPasswordStep2Form } from "@/components/_v1/forms/reset-password-form-step2";
import { Icons } from "@/components/_v1/icons";
import { Card, CardDescription, CardHeader, CardTitle } from "@gnd/ui/card";
import type { Metadata } from "next";

import PageShell from "@/components/page-shell";
export const metadata: Metadata = {
	title: "Reset Password | GND",
};
export default async function Page() {
	return (
		<PageShell>
			<div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center p-4">
				<header className="absolute top-0 left-0 z-30 w-full">
					<div className="p-6 md:p-8">
						<div className="h-8 w-auto">
							<Icons.LogoLg />
						</div>
					</div>
				</header>

				<Card className="shadow-xl border-0">
					<CardHeader className="space-y-1 pb-6">
						<CardTitle className="text-xl font-semibold text-center">
							Reset Password
						</CardTitle>
						<CardDescription className="text-center">
							Enter your verification code and new password to finish resetting
							your account
						</CardDescription>
					</CardHeader>
					<ResetPasswordStep2Form />
				</Card>
			</div>
		</PageShell>
	);
}
