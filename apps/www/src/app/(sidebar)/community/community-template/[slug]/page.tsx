// import { Breadcrumbs } from "@/components/_v1/breadcrumbs";
// import { BreadLink } from "@/components/_v1/breadcrumbs/links";

// import { DataPageShell } from "@/components/_v1/shells/data-page-shell";
// import { transformCommunityTemplate } from "@/lib/community/community-template";
// import type { Metadata } from "next";

// import { getCommunityTemplate } from "@/app-deps/(v1)/(loggedIn)/settings/community/_components/home-template";
// import ModelForm from "@/app-deps/(v1)/(loggedIn)/settings/community/_components/model-form/model-form";
// import { InstallCostSidebar } from "@/components/install-cost-sidebar";
// import { PageTitle } from "@gnd/ui/custom/page-title";

// import PageShell from "@/components/page-shell";
// import { redirect } from "next/navigation";
// export const metadata: Metadata = {
//     title: "Edit Community Template",
// };

// export default async function Page(props) {
//     const params = await props.params;
//     // redirect(`/community/community-template/${params.slug}/v1`);
//     // const response: any = await getCommunityTemplate(params.slug);
//     // if (response.meta?.design) {
//     //     response.meta.design = transformCommunityTemplate(response.meta.design);
//     // }
//     // return (
//     //     <PageShell>
//     //         <DataPageShell
//     //             data={{
//     //                 community: true,
//     //             }}
//     //             className="space-y-4 p-8"
//     //         >
//     //             <PageTitle>{response?.modelName}</PageTitle>

//     //             <ModelForm
//     //                 title={
//     //                     <div className="">
//     //                         <span>Edit Community Model</span>
//     //                     </div>
//     //                 }
//     //                 data={response as any}
//     //             />
//     //         </DataPageShell>
//     //         <InstallCostSidebar />
//     //     </PageShell>
//     // );
// }

import { ErrorFallback } from "@/components/error-fallback";
import { HydrateClient, getQueryClient, trpc } from "@/trpc/server";
import { constructMetadata } from "@gnd/utils/construct-metadata";
import { ErrorBoundary } from "next/dist/client/components/error-boundary";
import type { SearchParams } from "nuqs";
import { Suspense } from "react";

import PageShell from "@/components/page-shell";
import { CommunityTemplateV1Client } from "./community-template-v1-client";
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
