import { ErrorFallback } from "@/components/error-fallback";
import { CommunityTemplateForm } from "@/components/forms/community-template/community-template-form";
import { NewBlockAction } from "@/components/forms/community-template/new-block-action";
import { HydrateClient, batchPrefetch } from "@/trpc/server";
import Portal from "@gnd/ui/custom/portal";
import { Skeletons } from "@gnd/ui/custom/skeletons";
import { constructMetadata } from "@gnd/utils/construct-metadata";
import { ErrorBoundary } from "next/dist/client/components/error-boundary";
import type { SearchParams } from "nuqs";
import { Suspense } from "react";

import PageShell from "@/components/page-shell";
export async function generateMetadata(props) {
	return constructMetadata({
		title: "Template Schema | GND",
	});
}
type Props = {
	searchParams: Promise<SearchParams>;
	params: Promise<SearchParams>;
};
export default async function Page(props: Props) {
	const params = await props.params;

	batchPrefetch([]);
	return (
		<PageShell>
			<HydrateClient>
				<div className="flex flex-col p-4 gap-6">
					<div className="flex">
						<div className="flex-1"></div>
						<div id="blockAction" />
					</div>
					<ErrorBoundary errorComponent={ErrorFallback}>
						<Suspense fallback={<Skeletons.Dashboard />}>
							<CommunityTemplateForm>
								<Portal nodeId="blockAction">
									<NewBlockAction />
								</Portal>
							</CommunityTemplateForm>
						</Suspense>
					</ErrorBoundary>
				</div>
			</HydrateClient>
		</PageShell>
	);
}
