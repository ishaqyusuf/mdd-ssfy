"use client";

import { communityTemplateFilterParams } from "@/hooks/use-community-template-filter-params";
import { useTRPC } from "@/trpc/client";
import type { PageFilterData } from "@api/type";
import { buttonVariants } from "@gnd/ui/button";
import { cn } from "@gnd/ui/cn";
import Link from "next/link";
import { AuthGuard } from "./auth-guard";
import { SearchFilterAdapter as SearchFilter } from "./midday-search-filter/search-filter-adapter";
import { OpenCommunityTemplateModal } from "./open-community-template-modal";
import { _perm } from "./sidebar-links";
import { CommunityTemplatesColumnVisibility } from "./tables-2/community-templates/column-visibility";

type Props = {
	initialFilterList?: PageFilterData[];
};

export function CommunityTemplateHeader({ initialFilterList }: Props) {
	const trpc = useTRPC();

	return (
		<div className="flex flex-col gap-3 sm:flex-row sm:items-center">
			<div className="min-w-0 flex-1">
				<SearchFilter
					filterSchema={communityTemplateFilterParams}
					placeholder="Search Community Templates"
					trpcRoute={trpc.filters.communityTemplateFilters}
					initialFilterList={initialFilterList}
				/>
			</div>
			<div className="flex shrink-0 items-center justify-end gap-2">
				<CommunityTemplatesColumnVisibility />
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
		</div>
	);
}
