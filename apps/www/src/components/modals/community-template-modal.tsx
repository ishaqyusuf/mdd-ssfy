import { useCommunityTemplateParams } from "@/hooks/use-community-template-params";
import { CustomModal, CustomModalContent } from "./custom-modal";
import { useTRPC } from "@/trpc/client";
import { useQuery } from "@tanstack/react-query";
import { CommunityTemplateForm } from "../forms/community-template-form";
import { useEffect } from "react";

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
    useEffect(() => {
        console.log(error);
        console.log(data);
    }, [error, data]);
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

