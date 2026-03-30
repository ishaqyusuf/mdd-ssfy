import { CommunityProjectOverviewPage } from "@/components/community/overview-pages";
import { ErrorFallback } from "@/components/error-fallback";
import PageShell from "@/components/page-shell";
import { TableSkeleton } from "@/components/tables/skeleton";
import { constructMetadata } from "@/lib/(clean-code)/construct-metadata";
import { HydrateClient, batchPrefetch, getQueryClient, trpc } from "@/trpc/server";
import { PageTitle } from "@gnd/ui/custom/page-title";
import { ErrorBoundary } from "next/dist/client/components/error-boundary";
import { Suspense } from "react";

type Props = {
  params: Promise<{
    slug: string;
  }>;
};

export async function generateMetadata(props: Props) {
  const { slug } = await props.params;
  const overview = await getQueryClient().fetchQuery(
    trpc.community.communityProjectOverview.queryOptions({
      slug,
    }),
  );

  return constructMetadata({
    title: `${overview.title} | Community Project | GND`,
  });
}

export default async function Page(props: Props) {
  const { slug } = await props.params;
  const overview = await getQueryClient().fetchQuery(
    trpc.community.communityProjectOverview.queryOptions({
      slug,
    }),
  );

  batchPrefetch([
    trpc.community.communityProjectOverview.queryOptions({
      slug,
    }),
  ]);

  return (
    <PageShell>
      <HydrateClient>
        <div className="flex flex-col gap-6">
          <PageTitle>{overview.title}</PageTitle>
          <ErrorBoundary errorComponent={ErrorFallback}>
            <Suspense fallback={<TableSkeleton />}>
              <CommunityProjectOverviewPage slug={slug} />
            </Suspense>
          </ErrorBoundary>
        </div>
      </HydrateClient>
    </PageShell>
  );
}
