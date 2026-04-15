import dynamic from "next/dynamic";
import { useCommunityTemplateParams } from "@/hooks/use-community-template-params";
import { CustomModal, CustomModalContent } from "./custom-modal";
import { useTRPC } from "@/trpc/client";
import { useQuery } from "@gnd/ui/tanstack";

const CommunityTemplateForm = dynamic(
	() =>
		import("../forms/community-template-form").then(
			(mod) => mod.CommunityTemplateForm,
		),
);

export function CommunityTemplateModal({}) {
    const { createTemplate, templateId, setParams } =
        useCommunityTemplateParams();
    const opened = createTemplate || !!templateId;
    const trpc = useTRPC();
    const { data } = useQuery(
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
            {opened ? (
                <CustomModalContent className="">
                    <CommunityTemplateForm data={data} />
                </CustomModalContent>
            ) : null}
        </CustomModal>
    );
}
