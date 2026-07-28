import { LoginTemplate1 } from "@/components/login-template-1";
import type { Metadata } from "next";

import PageShell from "@/components/page-shell";
export const metadata: Metadata = {
	title: "Login | GND",
};
export default async function Page() {
	return (
		<PageShell>
			<LoginTemplate1 />
		</PageShell>
	);
}
