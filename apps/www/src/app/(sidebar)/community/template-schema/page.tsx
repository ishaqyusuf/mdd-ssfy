import { constructMetadata } from "@gnd/utils/construct-metadata";
import { batchPrefetch, HydrateClient } from "@/trpc/server";
import { SearchParams } from "nuqs";
import { PageTitle } from "@gnd/ui/custom/page-title";
import { NewBlockAction } from "@/components/forms/community-template-schema/new-block-action";
import { ErrorFallback } from "@/components/error-fallback";
import { Skeletons } from "@gnd/ui/custom/skeletons";
import { ErrorBoundary } from "next/dist/client/components/error-boundary";
import { Suspense } from "react";
import { SchemaForm } from "@/components/forms/community-template-schema/schema-form";
import Portal from "@gnd/ui/custom/portal";

export async function generateMetadata(props) {
    return constructMetadata({
        title: "Template Schema | GND",
    });
}
type Props = {
    searchParams: Promise<SearchParams>;
};
export default async function Page(props: Props) {
    const searchParams = await props.searchParams;

    batchPrefetch([]);
    return (
        <HydrateClient>
            <div className="flex flex-col p-4 gap-6">
                <PageTitle>Template Schema</PageTitle>
                <div className="flex">
                    <div className="flex-1"></div>
                    <div id="blockAction" />
                </div>
                <ErrorBoundary errorComponent={ErrorFallback}>
                    <Suspense fallback={<Skeletons.Dashboard />}>
                        <SchemaForm>
                            <Portal nodeId="blockAction">
                                <NewBlockAction />
                            </Portal>
                        </SchemaForm>
                    </Suspense>
                </ErrorBoundary>
            </div>
        </HydrateClient>
    );
}

