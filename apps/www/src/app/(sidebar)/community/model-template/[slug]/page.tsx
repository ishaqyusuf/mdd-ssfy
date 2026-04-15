import { ErrorFallback } from "@/components/error-fallback";
import { CommunityTemplateForm } from "@/components/forms/community-template/community-template-form";
import { FormHeader } from "@/components/forms/community-template/form-header";
import { HydrateClient, getQueryClient, trpc } from "@/trpc/server";
import { Skeletons } from "@gnd/ui/custom/skeletons";
import { constructMetadata } from "@gnd/utils/construct-metadata";
import { ErrorBoundary } from "next/dist/client/components/error-boundary";
import type { SearchParams } from "nuqs";
import { Suspense } from "react";
import PageShell from "@/components/page-shell";
export async function generateMetadata(props) {
	return constructMetadata({
		title: "Model Template | GND",
	});
}
type Props = {
	searchParams: Promise<SearchParams>;
	params: Promise<SearchParams>;
};
export default async function Page(props: Props) {
	const params = await props.params;
	const queryClient = getQueryClient();

	await Promise.all([
		queryClient.fetchQuery(trpc.community.getCommunitySchema.queryOptions({})),
		queryClient.fetchQuery(trpc.community.getBlockInputs.queryOptions({})),
		queryClient.fetchQuery(
			trpc.community.getModelTemplate.queryOptions({
				slug: params.slug as any,
			}),
		),
	]);
	return (
		<PageShell>
			<HydrateClient>
				<div className="flex flex-col p-4 gap-6">
					<ErrorBoundary errorComponent={ErrorFallback}>
						<Suspense fallback={<Skeletons.Dashboard />}>
							<CommunityTemplateForm modelSlug={params.slug as any}>
								<FormHeader />
							</CommunityTemplateForm>
						</Suspense>
					</ErrorBoundary>
				</div>
			</HydrateClient>
		</PageShell>
	);
}
