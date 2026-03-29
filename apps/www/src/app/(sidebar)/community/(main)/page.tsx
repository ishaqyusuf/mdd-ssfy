import FPage from "@/components/(clean-code)/fikr-ui/f-page";
import { CommunityDashboard } from "@/components/community-dashboard";
import { constructMetadata } from "@/lib/(clean-code)/construct-metadata";
import { batchPrefetch, HydrateClient, trpc } from "@/trpc/server";
import { PageTitle } from "@gnd/ui/custom/page-title";

export async function generateMetadata(props) {
    return constructMetadata({
        title: "Community Dashboard | GND",
    });
}

export default async function Page() {
    batchPrefetch([trpc.community.communityDashboardOverview.queryOptions({})]);

    return (
        <div className="flex flex-col gap-6 px-4 sm:px-6">
            <PageTitle>Community Dashboard</PageTitle>
            <HydrateClient>
                <CommunityDashboard />
            </HydrateClient>
        </div>
    );
}

