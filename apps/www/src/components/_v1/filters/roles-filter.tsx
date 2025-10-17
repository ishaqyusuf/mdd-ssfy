"use client";

import { staticRolesAction } from "@/app/(v1)/_actions/hrm/static-roles";
import { DynamicFilter } from "../data-table/data-table-dynamic-filter";

export function RolesFilter({ table }) {
    return (
        <DynamicFilter
            table={table}
            single
            listKey="staticRoles"
            labelKey="name"
            valueKey="id"
            title="Role"
            columnId="_roleId"
            loader={staticRolesAction}
        />
    );
}
