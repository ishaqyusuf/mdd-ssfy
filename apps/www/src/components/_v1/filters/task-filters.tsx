"use client";

import { ISlicer } from "@/store/slicers";
import { DynamicFilter } from "../data-table/data-table-dynamic-filter";
import { staticProjectsAction } from "@/app/(v1)/_actions/community/projects";
import {
    TaskNameWhere,
    _taskNames,
} from "@/app/(v1)/_actions/community/_task-names";

interface Props {
    table;
    listKey: keyof ISlicer;
    query: TaskNameWhere;
}
export function TaskFilters({ table, listKey, query }: Props) {
    return (
        <DynamicFilter
            table={table}
            listKey={listKey}
            title="Task"
            columnId="_task"
            loader={async () => {
                return await _taskNames(query);
            }}
        />
    );
}
