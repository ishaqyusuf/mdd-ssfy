import { constructMetadata } from "@gnd/utils/construct-metadata";
import { batchPrefetch, HydrateClient } from "@/trpc/server";
import { SearchParams } from "nuqs";
import { ErrorFallback } from "@/components/error-fallback";
import { Skeletons } from "@gnd/ui/custom/skeletons";
import { ErrorBoundary } from "next/dist/client/components/error-boundary";
import { Suspense } from "react";
import { CommunityTemplateV1Form } from "@/components/forms/community-template-v1";

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

    batchPrefetch([]);
    return (
        <HydrateClient>
            <div className="flex flex-col gap-6">
                <ErrorBoundary errorComponent={ErrorFallback}>
                    <Suspense fallback={<Skeletons.Dashboard />}>
                        <CommunityTemplateV1Form slug={slug} />
                    </Suspense>
                </ErrorBoundary>
            </div>
        </HydrateClient>
    );
}

