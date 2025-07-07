"use client";

import { DynamicFilter } from "../data-table/data-table-dynamic-filter";
import { staticProjectsAction } from "@/app/(v1)/_actions/community/projects";

export function ProjectsFilter({ table }) {
    return (
        <DynamicFilter
            table={table}
            single
            listKey="staticProjects"
            labelKey="title"
            valueKey="id"
            title="Projects"
            columnId="_projectId"
            loader={staticProjectsAction}
        />
    );
}
