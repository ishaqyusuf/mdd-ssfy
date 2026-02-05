import { CustomModal, CustomModalContent } from "./custom-modal";

import { useQuery } from "@gnd/ui/tanstack";

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
            },
        ),
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

