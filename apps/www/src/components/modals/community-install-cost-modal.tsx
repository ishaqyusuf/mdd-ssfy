import { CustomModal, CustomModalContent } from "./custom-modal";
import { useTRPC } from "@/trpc/client";
import { useQuery } from "@gnd/ui/tanstack";

import { useCommunityInstallCostParams } from "@/hooks/use-community-install-cost-params";
import { CommunityInstallCostForm } from "../forms/community-install-cost-form";
import { Skeletons } from "@gnd/ui/custom/skeletons";
import { Skeleton } from "@gnd/ui/skeleton";

export function CommunityInstallCostModal() {
    const { editCommunityModelInstallCostId, openToSide, setParams } =
        useCommunityInstallCostParams();
    const trpc = useTRPC();
    const { data, isPending, error } = useQuery(
        trpc.community.communityInstallCostForm.queryOptions(
            {
                projectId: editCommunityModelInstallCostId,
            },
            {
                enabled: !!editCommunityModelInstallCostId,
            },
        ),
    );

    return (
        <CustomModal
            open={!!editCommunityModelInstallCostId && !openToSide}
            onOpenChange={(e) => {
                setParams(null);
            }}
            size="xl"
            title={`Install Cost (${data?.title})`}
            description={data?.subtitle}
        >
            <div className="flex flex-col gap-4">
                <div className="" id="installCostModalAction"></div>
                <CustomModalContent className="lg:max-h-[55vh] overflow-auto">
                    {isPending ? (
                        <div className="grid gap-2">
                            <>
                                <Skeleton className="h-10" />
                                {[...Array(10)].map((_, i) => (
                                    <Skeleton key={i} className="h-16" />
                                ))}
                            </>
                        </div>
                    ) : (
                        <CommunityInstallCostForm model={data} />
                    )}
                </CustomModalContent>
            </div>
        </CustomModal>
    );
}

