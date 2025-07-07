"use client";
import { DynamicFilter } from "@/components/_v1/data-table/data-table-dynamic-filter";

import { getDykeCategoriesList } from "../../_actions/dyke-categories-list";

export function ProductCategoryFilter({ table }) {
    return (
        <DynamicFilter
            table={table}
            single
            title="Category"
            columnId="_categoryId"
            listKey={"prodCategory" as any}
            loader={getDykeCategoriesList}
        />
    );
}
