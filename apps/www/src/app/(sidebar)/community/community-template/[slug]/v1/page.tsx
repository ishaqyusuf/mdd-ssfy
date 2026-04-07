import { ErrorFallback } from "@/components/error-fallback";
import { CommunityTemplateV1Form } from "@/components/forms/community-template-v1";
import { HydrateClient, batchPrefetch, trpc } from "@/trpc/server";
import { Skeletons } from "@gnd/ui/custom/skeletons";
import { constructMetadata } from "@gnd/utils/construct-metadata";
import { ErrorBoundary } from "next/dist/client/components/error-boundary";
import type { SearchParams } from "nuqs";
import { Suspense } from "react";

import PageShell from "@/components/page-shell";
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

	batchPrefetch([
		trpc.community.getCommunityTemplateLegacy.queryOptions({ slug }),
	]);
	return (
		<PageShell>
			<HydrateClient>
				<div className="flex flex-col gap-6">
					<ErrorBoundary errorComponent={ErrorFallback}>
						<Suspense fallback={<Skeletons.Dashboard />}>
							<CommunityTemplateV1Form slug={slug} />
						</Suspense>
					</ErrorBoundary>
				</div>
			</HydrateClient>
		</PageShell>
	);
}
