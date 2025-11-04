import { useCommunityTemplateParams } from "@/hooks/use-community-template-params";
import { CustomModal, CustomModalContent } from "./custom-modal";
import { useTRPC } from "@/trpc/client";
import { useQuery } from "@gnd/ui/tanstack";
import { CommunityTemplateForm } from "../forms/community-template-form";
import { useCommunityModelCostParams } from "@/hooks/use-community-model-cost-params";
import { CreateModelCostForm } from "../forms/create-model-cost-form";
import { useCommunityProjectParams } from "@/hooks/use-community-project-params";
import { _trpc } from "../static-trpc";

export function CreateCommunityProjectModal({}) {
    const { setParams, opened, openCommunityProjectId } =
        useCommunityProjectParams();
    // const opened = createModelCost;

    const { data, isPending } = useQuery(
        _trpc.community.getProjectForm.queryOptions(
            {
                projectId: openCommunityProjectId!,
            },
            {
                enabled: opened,
            }
        )
    );
    return (
        <CustomModal
            size="md"
            title="Project Form"
            open={opened}
            onOpenChange={(e) => {
                setParams(null);
            }}
        >
            <CustomModalContent className=""></CustomModalContent>
        </CustomModal>
    );
}

