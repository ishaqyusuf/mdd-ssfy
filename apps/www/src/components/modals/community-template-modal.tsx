import { useCommunityTemplateParams } from "@/hooks/use-community-template-params";
import { CustomModal, CustomModalContent } from "./custom-modal";
import { useTRPC } from "@/trpc/client";
import { useQuery } from "@tanstack/react-query";
import { CommunityTemplateForm } from "../forms/community-template-form";

export function CommunityTemplateModal({}) {
    const { createTemplate, templateId, setParams } =
        useCommunityTemplateParams();
    const opened = createTemplate || !!templateId;
    const trpc = useTRPC();
    const { data, isPending, error } = useQuery(
        trpc.community.getCommunityTemplateForm.queryOptions(
            {
                templateId,
            },
            {
                enabled: !!templateId,
            },
        ),
    );

    return (
        <CustomModal
            className=" "
            size="md"
            title="Community Template Form"
            open={opened}
            onOpenChange={(e) => {
                setParams(null);
            }}
        >
            <CustomModalContent className="">
                <CommunityTemplateForm data={data} />
            </CustomModalContent>
        </CustomModal>
    );
}

