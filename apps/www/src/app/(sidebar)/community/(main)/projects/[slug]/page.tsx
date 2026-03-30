import { CommunityProjectOverviewPage } from "@/components/community/overview-pages";
import { ErrorFallback } from "@/components/error-fallback";
import PageShell from "@/components/page-shell";
import { TableSkeleton } from "@/components/tables/skeleton";
import { constructMetadata } from "@/lib/(clean-code)/construct-metadata";
import { HydrateClient, batchPrefetch, trpc } from "@/trpc/server";
import { ErrorBoundary } from "next/dist/client/components/error-boundary";
import { Suspense } from "react";

type Props = {
  params: Promise<{
    slug: string;
  }>;
};

export async function generateMetadata(props: Props) {
  const { slug } = await props.params;

  return constructMetadata({
    title: `${slug} | Community Project | GND`,
  });
}

export default async function Page(props: Props) {
  const { slug } = await props.params;

  batchPrefetch([
    trpc.community.communityProjectOverview.queryOptions({
      slug,
    }),
  ]);

  return (
    <PageShell>
      <HydrateClient>
        <ErrorBoundary errorComponent={ErrorFallback}>
          <Suspense fallback={<TableSkeleton />}>
            <CommunityProjectOverviewPage slug={slug} />
          </Suspense>
        </ErrorBoundary>
      </HydrateClient>
    </PageShell>
  );
}
