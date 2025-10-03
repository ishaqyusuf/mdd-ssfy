import { constructMetadata } from "@gnd/utils/construct-metadata";
import { batchPrefetch, HydrateClient } from "@/trpc/server";
import { SearchParams } from "nuqs";
import { PageTitle } from "@gnd/ui/custom/page-title";
import { NewBlockAction } from "@/components/forms/community-template/new-block-action";
import { ErrorFallback } from "@/components/error-fallback";
import { Skeletons } from "@gnd/ui/custom/skeletons";
import { ErrorBoundary } from "next/dist/client/components/error-boundary";
import { Suspense } from "react";
import { CommunityTemplateForm } from "@/components/forms/community-template/community-template-form";
import Portal from "@gnd/ui/custom/portal";
import { ModelTemplateHeader } from "@/components/model-template-header";
import { FormHeader } from "@/components/forms/community-template/form-header";

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

    batchPrefetch([]);
    return (
        <HydrateClient>
            <div className="flex flex-col p-4 gap-6">
                {/* <ErrorBoundary errorComponent={ErrorFallback}>
                    <Suspense fallback={<Skeletons.Dashboard />}> */}
                <CommunityTemplateForm modelSlug={params.slug as any}>
                    <FormHeader />
                </CommunityTemplateForm>
                {/* </Suspense>
                </ErrorBoundary> */}
            </div>
        </HydrateClient>
    );
}

