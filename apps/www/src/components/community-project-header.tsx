"use client";

import { Icons } from "@gnd/ui/icons";

import ProjectModal from "@/app-deps/(v1)/(loggedIn)/community/projects/project-modal";
import { useModal } from "@/components/common/modal/provider";
import { communityProjectFilterParams } from "@/hooks/use-community-project-filter-params";
import { useTRPC } from "@/trpc/client";
import { Button } from "@gnd/ui/button";
import { SearchFilterAdapter as SearchFilter } from "./midday-search-filter/search-filter-adapter";

export function CommunityProjectHeader() {
	const modal = useModal();
	const trpc = useTRPC();

	return (
		<div className="flex justify-between">
			<SearchFilter
				filterSchema={communityProjectFilterParams}
				placeholder="Search Projects..."
				trpcRoute={trpc.filters.communityProject}
			/>
			<div className="flex-1" />
			<Button onClick={() => modal.openModal(<ProjectModal />)}>
				<Icons.Plus className="mr-2 size-4" />
				<span className="hidden lg:inline">Add Project</span>
			</Button>
		</div>
	);
}
