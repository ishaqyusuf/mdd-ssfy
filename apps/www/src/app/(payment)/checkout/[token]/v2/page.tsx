import { SquareTokenCheckoutV2 } from "@/components/square-token-checkout-v2";
import { SquareTokenCheckoutV2Skeleton } from "@/components/square-token-checkout-v2-skeleton";
import { constructMetadata } from "@/lib/(clean-code)/construct-metadata";
import { Suspense } from "react";

import PageShell from "@/components/page-shell";
export async function generateMetadata() {
	return constructMetadata({
		title: "Checkout - gndprodesk.com",
	});
}

type Props = {
	params: Promise<{
		token: string;
	}>;
};

export default async function Page(props: Props) {
	const params = await props.params;

	return (
		<PageShell>
			<Suspense fallback={<SquareTokenCheckoutV2Skeleton />}>
				<SquareTokenCheckoutV2 token={params.token} />
			</Suspense>
		</PageShell>
	);
}
