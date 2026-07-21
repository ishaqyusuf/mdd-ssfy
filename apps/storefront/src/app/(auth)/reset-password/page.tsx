import { Suspense } from "react";
import { ResetPasswordClient } from "./page-client";

export default function ResetPasswordPage() {
	return (
		<Suspense
			fallback={<div className="container mx-auto px-4 py-16">Loading…</div>}
		>
			<ResetPasswordClient />
		</Suspense>
	);
}
