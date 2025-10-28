import { OpenCommunityTemplateModal } from "./open-community-template-modal";
import { CommunityTemplateSearchFilter } from "./community-template-search-filter";
import Link from "next/link";
import { cn } from "@gnd/ui/cn";
import { buttonVariants } from "@gnd/ui/button";
import { SuperAdminGuard } from "./auth-guard";

export function CommunityTemplateHeader({}) {
    return (
        <div className="flex gap-4">
            <CommunityTemplateSearchFilter />
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

