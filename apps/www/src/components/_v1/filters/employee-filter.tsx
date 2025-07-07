"use client";

import {
    staticEmployees,
    staticJobEmployees,
    staticLoadTechEmployees,
} from "@/app/(v1)/_actions/hrm/get-employess";
import { DynamicFilter } from "../data-table/data-table-dynamic-filter";

export function PayableEmployees({ table }) {
    return (
        <DynamicFilter
            table={table}
            single
            listKey="staticPayableEmployees"
            labelKey="name"
            valueKey="id"
            title="Employee"
            columnId="_userId"
            loader={staticJobEmployees}
        />
    );
}
export function TechEmployeeFilter({ table }) {
    return (
        <DynamicFilter
            table={table}
            single
            listKey="staticTechEmployees"
            labelKey="name"
            valueKey="id"
            title="Tech"
            columnId="_userId"
            loader={staticLoadTechEmployees}
        />
    );
}
