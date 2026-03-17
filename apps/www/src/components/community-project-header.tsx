"use client";

import { Button } from "@gnd/ui/button";
import { Icons } from "@gnd/ui/icons";
import { CommunitySearchFilter } from "./community-search-filter";
import { useCommunityProjectParams } from "@/hooks/use-community-project-params";
import ProjectModal from "@/app-deps/(v1)/(loggedIn)/community/projects/project-modal";
import { useModal } from "@/components/common/modal/provider";
export function CommunityProjectHeader({}) {
    const { setParams } = useCommunityProjectParams();

    const modal = useModal();
    return (
        <div className="flex justify-between">
            <CommunitySearchFilter />
            <div className="flex-1"></div>
            <Button
                onClick={(e) => {
                    // setParams({
                    //     openCommunityProjectId: -1,
                    // });
                    modal.openModal(<ProjectModal />);
                }}
            >
                <Icons.Add className="size-4 mr-2" />
                <span>Add Project</span>
            </Button>
        </div>
    );
}

