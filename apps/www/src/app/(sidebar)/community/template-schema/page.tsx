import { ErrorFallback } from "@/components/error-fallback";
import { HydrateClient, getQueryClient, trpc } from "@/trpc/server";
import { constructMetadata } from "@gnd/utils/construct-metadata";
import { ErrorBoundary } from "next/dist/client/components/error-boundary";
import type { SearchParams } from "nuqs";
import { Suspense } from "react";

import PageShell from "@/components/page-shell";
import { TemplateSchemaClient } from "./template-schema-client";
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
	await props.params;
	const queryClient = getQueryClient();

	await Promise.all([
		queryClient.fetchQuery(trpc.community.getCommunitySchema.queryOptions({})),
		queryClient.fetchQuery(trpc.community.getBlockInputs.queryOptions({})),
	]);
	return (
		<PageShell>
			<HydrateClient>
				<div className="flex flex-col p-4 gap-6">
					<div className="flex">
						<div className="flex-1"></div>
						<div id="blockAction" />
					</div>
					<ErrorBoundary errorComponent={ErrorFallback}>
						<Suspense fallback={null}>
							<TemplateSchemaClient />
						</Suspense>
					</ErrorBoundary>
				</div>
			</HydrateClient>
		</PageShell>
	);
}
