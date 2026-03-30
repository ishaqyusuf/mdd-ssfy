import { Login01 } from "@/components/login-01";
import { Login02 } from "@/components/login-02";
import { Login03 } from "@/components/login-03";
import type { Metadata } from "next";

import PageShell from "@/components/page-shell";
export const metadata: Metadata = {
	title: "Login | GND",
};
export default async function Page() {
	const LoginTempales = [<Login03 />, <Login01 />, <Login02 />];
	return (
		<PageShell>
			{" "}
			<>{LoginTempales[0]}</>
		</PageShell>
	);
}
