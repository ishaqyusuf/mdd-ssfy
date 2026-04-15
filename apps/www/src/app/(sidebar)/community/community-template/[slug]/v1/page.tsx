import { ErrorFallback } from "@/components/error-fallback";
import { HydrateClient, getQueryClient, trpc } from "@/trpc/server";
import { constructMetadata } from "@gnd/utils/construct-metadata";
import { ErrorBoundary } from "next/dist/client/components/error-boundary";
import type { SearchParams } from "nuqs";
import { Suspense } from "react";

import PageShell from "@/components/page-shell";
import { CommunityTemplateV1Client } from "../community-template-v1-client";
export const metadata = constructMetadata({
	title: "Edit Community Template | GND",
});

type Props = {
	searchParams: Promise<SearchParams>;
	params: Promise<{
		slug: string;
	}>;
};

export default async function Page(props: Props) {
	const { slug } = await props.params;
	const queryClient = getQueryClient();

	await queryClient.fetchQuery(
		trpc.community.getCommunityTemplateLegacy.queryOptions({ slug }),
	);
	return (
		<PageShell>
			<HydrateClient>
				<div className="flex flex-col gap-6">
					<ErrorBoundary errorComponent={ErrorFallback}>
						<Suspense fallback={null}>
							<CommunityTemplateV1Client slug={slug} />
						</Suspense>
					</ErrorBoundary>
				</div>
			</HydrateClient>
		</PageShell>
	);
}
