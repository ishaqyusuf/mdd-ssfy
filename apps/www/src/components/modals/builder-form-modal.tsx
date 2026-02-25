import { useBuilderParams } from "@/hooks/use-builder-params";
import { CustomModal } from "./custom-modal";
import { useQuery } from "@tanstack/react-query";
import { useTRPC } from "@/trpc/client";
import { BuilderForm } from "../builder-form";
import { BuilderFormAction } from "../builder-form-action";

export function BuilderFormModal({}) {
    const { opened, openBuilderId, onClose } = useBuilderParams();
    // const opened = createModelCost;
    const { data: formData } = useQuery(
        useTRPC().community.getBuilderForm.queryOptions(
            {
                builderId: openBuilderId!,
            },
            {
                enabled: opened && openBuilderId! > 0,
            },
        ),
    );
    return (
        <CustomModal
            size="3xl"
            title={openBuilderId > 0 ? "Edit Builder" : "New Builder"}
            description={"Define builder details and standard task templates"}
            open={opened}
            onOpenChange={(open) => {
                if (open) return;
                onClose();
            }}
        >
            <CustomModal.Content className="bg-muted/10 py-2 pb-16">
                <BuilderForm defaultValues={formData}>
                    <CustomModal.Footer>
                        <BuilderFormAction />
                    </CustomModal.Footer>
                </BuilderForm>
            </CustomModal.Content>
        </CustomModal>
    );
}
