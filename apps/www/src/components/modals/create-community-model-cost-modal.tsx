import { useCommunityTemplateParams } from "@/hooks/use-community-template-params";
import { CustomModal, CustomModalContent } from "./custom-modal";
import { useTRPC } from "@/trpc/client";
import { useQuery } from "@gnd/ui/tanstack";
import { CommunityTemplateForm } from "../forms/community-template-form";
import { useCommunityModelCostParams } from "@/hooks/use-community-model-cost-params";
import { CreateModelCostForm } from "../forms/create-model-cost-form";

export function CreateCommunityModelCostModal({}) {
    const { createModelCost, setParams } = useCommunityModelCostParams();
    const opened = createModelCost;

    return (
        <CustomModal
            className=" "
            size="md"
            title="Model Form"
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

