import { WorkerJobsList } from "@/components/jobs-dashboard/worker-jobs-list";
import { loadJobFilterParams } from "@/hooks/use-contractor-jobs-filter-params";
import { getServerAuthSession } from "@/lib/auth/session";
import { HydrateClient, getQueryClient, trpc } from "@/trpc/server";
import { constructMetadata } from "@gnd/utils/construct-metadata";
import type { SearchParams } from "nuqs";

import PageShell from "@/components/page-shell";
export const dynamic = "force-dynamic";

export async function generateMetadata() {
    return constructMetadata({
        title: "Jobs List | GND",
    });
}

type Props = {
    searchParams: Promise<SearchParams>;
};

export default async function JobsDashboardJobsListPage(props: Props) {
    const [searchParams, session] = await Promise.all([
        props.searchParams,
        getServerAuthSession(),
    ]);
    const userId = Number(session?.user?.id || 0);
    const filter = {
        ...loadJobFilterParams(searchParams),
        ...(userId ? { userId } : {}),
    };
    const queryClient = getQueryClient();

    await queryClient.fetchInfiniteQuery(
        trpc.jobs.getJobs.infiniteQueryOptions(filter) as any,
    );

    return (
        <PageShell>
            <HydrateClient>
                <WorkerJobsList userId={userId} />
            </HydrateClient>
        </PageShell>
    );
}
