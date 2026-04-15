import dynamic from "next/dynamic";
import { CustomModal, CustomModalContent } from "./custom-modal";
import { useCommunityModelCostParams } from "@/hooks/use-community-model-cost-params";

const CreateModelCostForm = dynamic(
	() =>
		import("../forms/create-model-cost-form").then(
			(mod) => mod.CreateModelCostForm,
		),
);

export function CreateCommunityModelCostModal({}) {
    const { createModelCost, setParams } = useCommunityModelCostParams();
    const opened = createModelCost;

    return (
        <CustomModal
            size="md"
            title="Model Form"
            open={opened}
            onOpenChange={(e) => {
                setParams(null);
            }}
        >
            {opened ? (
                <CustomModalContent className="">
                    <CreateModelCostForm />
                </CustomModalContent>
            ) : null}
        </CustomModal>
    );
}
