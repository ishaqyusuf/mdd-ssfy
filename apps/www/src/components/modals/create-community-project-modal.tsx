import { useCommunityTemplateParams } from "@/hooks/use-community-template-params";
import { CustomModal, CustomModalContent } from "./custom-modal";
import { useTRPC } from "@/trpc/client";
import { useQuery } from "@gnd/ui/tanstack";
import { CommunityTemplateForm } from "../forms/community-template-form";
import { useCommunityModelCostParams } from "@/hooks/use-community-model-cost-params";
import { CreateModelCostForm } from "../forms/create-model-cost-form";
import { useCommunityProjectParams } from "@/hooks/use-community-project-params";

export function CreateCommunityProjectModal({}) {
    const { setParams, opened } = useCommunityProjectParams();
    // const opened = createModelCost;

    return (
        <CustomModal
            size="md"
            title="Project Form"
            open={opened}
            onOpenChange={(e) => {
                setParams(null);
            }}
        >
            <CustomModalContent className="">
                <CreateModelCostForm />
            </CustomModalContent>
        </CustomModal>
    );
}

