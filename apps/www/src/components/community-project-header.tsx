"use client";

import ProjectModal from "@/app-deps/(v1)/(loggedIn)/community/projects/project-modal";
import { useModal } from "@/components/common/modal/provider";
import { communityProjectFilterParams } from "@/hooks/use-community-project-filter-params";
import { useQueryStates } from "nuqs";
import { SearchFilter } from "@gnd/ui/search-filter";
import { _trpc } from "./static-trpc";
import { Button } from "@gnd/ui/button";
import { Plus } from "lucide-react";

export function CommunityProjectHeader() {
  const modal = useModal();
  const [filters, setFilters] = useQueryStates(communityProjectFilterParams);

  return (
    <div className="flex justify-between">
      <SearchFilter
        filterSchema={communityProjectFilterParams}
        placeholder="Search Projects..."
        trpcRoute={_trpc.filters.communityProject}
        {...{ filters, setFilters }}
      />
      <div className="flex-1" />
      <Button onClick={() => modal.openModal(<ProjectModal />)}>
        <Plus className="mr-2 size-4" />
        Add Project
      </Button>
    </div>
  );
}
