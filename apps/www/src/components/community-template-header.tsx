import type { PageFilterData } from "@api/type";
import { buttonVariants } from "@gnd/ui/button";
import { cn } from "@gnd/ui/cn";
import Link from "next/link";
import { AuthGuard } from "./auth-guard";
import { CommunityTemplateSearchFilter } from "./community-template-search-filter";
import { OpenCommunityTemplateModal } from "./open-community-template-modal";
import { _perm } from "./sidebar/links";

type Props = {
	initialFilterList?: PageFilterData[];
};

export function CommunityTemplateHeader({ initialFilterList }: Props) {
	return (
		<div className="flex gap-4">
			<CommunityTemplateSearchFilter initialFilterList={initialFilterList} />
			<div className="flex-1" />
			<AuthGuard rules={[_perm.is("editCommunityUnit")]}>
				<Link
					className={cn(
						buttonVariants({
							variant: "secondary",
						}),
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
