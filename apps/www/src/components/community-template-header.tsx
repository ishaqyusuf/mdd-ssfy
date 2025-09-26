import { OpenCommunityTemplateModal } from "./open-community-template-modal";
import { CommunityTemplateSearchFilter } from "./community-template-search-filter";

export function CommunityTemplateHeader({}) {
    return (
        <div className="flex justify-between">
            <CommunityTemplateSearchFilter />
            <OpenCommunityTemplateModal />
        </div>
    );
}

