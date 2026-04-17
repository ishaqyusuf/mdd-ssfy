import { OpenCommunityTemplateModal } from "./open-community-template-modal";
import { CommunityTemplateSearchFilter } from "./community-template-search-filter";
import Link from "next/link";
import { cn } from "@gnd/ui/cn";
import { buttonVariants } from "@gnd/ui/button";
import { AuthGuard } from "./auth-guard";
import { _role } from "./sidebar/links";
import type { PageFilterData } from "@api/type";

type Props = {
    initialFilterList?: PageFilterData[];
};

export function CommunityTemplateHeader({ initialFilterList }: Props) {
    return (
        <div className="flex gap-4">
            <CommunityTemplateSearchFilter initialFilterList={initialFilterList} />
            <div className="flex-1" />
            <AuthGuard rules={[_role.some("Super Admin", "CommunityUnit")]}>
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
            </AuthGuard>
            <OpenCommunityTemplateModal />
        </div>
    );
}
