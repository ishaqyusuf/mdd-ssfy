import { OpenCommunityTemplateModal } from "./open-community-template-modal";
import { CommunityTemplateSearchFilter } from "./community-template-search-filter";
import Link from "next/link";
import { cn } from "@gnd/ui/cn";
import { buttonVariants } from "@gnd/ui/button";
import { SuperAdminGuard } from "./auth-guard";
import type { PageFilterData } from "@api/type";

type Props = {
    initialFilterList?: PageFilterData[];
};

export function CommunityTemplateHeader({ initialFilterList }: Props) {
    return (
        <div className="flex gap-4">
            <CommunityTemplateSearchFilter initialFilterList={initialFilterList} />
            <div className="flex-1"></div>
            <SuperAdminGuard>
                <Link
                    className={cn(
                        buttonVariants({
                            variant: "secondary",
                        })
                    )}
                    href={"/community/template-schema"}
                >
                    Edit Template
                </Link>
            </SuperAdminGuard>
            <OpenCommunityTemplateModal />
        </div>
    );
}
