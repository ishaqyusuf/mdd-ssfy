"use client";
import PageShell from "@/components/page-shell";

import { signOut } from "next-auth/react";
import { useEffect } from "react";

export default function SignoutPage() {
	useEffect(() => {
		signOut({
			redirect: true,
			callbackUrl: "/login/v2",
		});
	}, []);

	return (
		<PageShell>
			{" "}
			<></>
		</PageShell>
	);
}
