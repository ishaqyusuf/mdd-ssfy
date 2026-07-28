import { SigninComponent } from "@/components/signin";
import type { Metadata } from "next";

import PageShell from "@/components/page-shell";
export const metadata: Metadata = {
	title: "Sign In | GND",
};

export default async function SigninPage() {
	return (
		<PageShell>
			{" "}
			<SigninComponent />
		</PageShell>
	);
}
