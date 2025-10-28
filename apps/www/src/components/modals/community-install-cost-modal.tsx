import { CustomModal, CustomModalContent } from "./custom-modal";
import { useTRPC } from "@/trpc/client";
import { useQuery } from "@gnd/ui/tanstack";

import { useCommunityInstallCostParams } from "@/hooks/use-community-install-cost-params";
import { CommunityInstallCostForm } from "../forms/community-install-cost-form";

export function CommunityInstallCostModal() {
    const { editCommunityModelInstallCostId, setParams } =
        useCommunityInstallCostParams();
    const trpc = useTRPC();
    const { data, error } = useQuery(
        trpc.community.communityInstallCostForm.queryOptions(
            {
                projectId: editCommunityModelInstallCostId,
            },
            {
                enabled: !!editCommunityModelInstallCostId,
            }
        )
    );

    return (
        <CustomModal
            open={!!editCommunityModelInstallCostId}
            onOpenChange={(e) => {
                setParams(null);
            }}
            size="xl"
            title={`Model Cost (${data?.title})`}
            description={data?.subtitle}
        >
            <div className="flex flex-col gap-4">
                <div className="" id="installCostModalAction"></div>
                <CustomModalContent className="lg:max-h-[55vh] overflow-auto">
                    <CommunityInstallCostForm model={data} />
                </CustomModalContent>
            </div>
        </CustomModal>
    );
}

