import PageShell from "@/components/page-shell";
import {
	QuoteAcceptancePage,
	QuoteAcceptancePageSkeleton,
} from "@/components/quote-acceptance-page";
import { constructMetadata } from "@/lib/(clean-code)/construct-metadata";
import { Suspense } from "react";

export async function generateMetadata() {
	return constructMetadata({
		title: "Accept Quote - gndprodesk.com",
	});
}

type Props = {
	params: Promise<{
		orderId: string;
	}>;
	searchParams: Promise<{
		token?: string;
	}>;
};

export default async function Page(props: Props) {
	const [params, searchParams] = await Promise.all([
		props.params,
		props.searchParams,
	]);

	if (!searchParams.token) {
		return (
			<PageShell>
				<div className="mx-auto flex min-h-[50vh] max-w-2xl items-center px-4 py-10">
					<div className="rounded-3xl border border-rose-200 bg-rose-50 p-6 text-sm text-rose-900">
						This quote acceptance link is incomplete. Please use the full link
						from your email.
					</div>
				</div>
			</PageShell>
		);
	}

	return (
		<PageShell>
			<Suspense fallback={<QuoteAcceptancePageSkeleton />}>
				<QuoteAcceptancePage
					orderId={params.orderId}
					token={searchParams.token}
				/>
			</Suspense>
		</PageShell>
	);
}
