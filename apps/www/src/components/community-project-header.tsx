"use client";

import { Icons } from "@gnd/ui/icons";

import ProjectModal from "@/app-deps/(v1)/(loggedIn)/community/projects/project-modal";
import { useModal } from "@/components/common/modal/provider";
import { communityProjectFilterParams } from "@/hooks/use-community-project-filter-params";
import { useTRPC } from "@/trpc/client";
import { SearchFilter } from "@gnd/ui/search-filter";
import { Button } from "@gnd/ui/button";
import { useQueryStates } from "nuqs";

export function CommunityProjectHeader() {
  const modal = useModal();
  const trpc = useTRPC();
  const [filters, setFilters] = useQueryStates(communityProjectFilterParams);

  return (
    <div className="flex justify-between">
      <SearchFilter
        filterSchema={communityProjectFilterParams}
        placeholder="Search Projects..."
        trpcRoute={trpc.filters.communityProject}
        {...{ filters, setFilters }}
      />
      <div className="flex-1" />
      <Button onClick={() => modal.openModal(<ProjectModal />)}>
        <Icons.Plus className="mr-2 size-4" />
        Add Project
      </Button>
    </div>
  );
}
