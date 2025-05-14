import { __filters } from "@/app/(clean-code)/(sales)/_common/utils/contants";
import { createColumnHelper } from "@tanstack/react-table";

import { FilterKeys } from "../search-params";
import { DataTableFilterField } from "../type";

export const queryKeys = [
    "orders",
    "quotes",
    "sales-delivery",
    "customers",
    "sales-productions",
    "sales-dispatch",
    "production-tasks",
    "sales-accounting",
] as const;
export type QueryKeys = (typeof queryKeys)[number];
export type Filters = Partial<{
    [id in QueryKeys]: Partial<{
        fields: any[];
        options: Partial<{
            [id in FilterKeys]: any;
        }>;
        filterColumns: FilterColumn[];
    }>;
}>;
type FilterColumn = ReturnType<typeof columnHelper.accessor>;
const columnHelper = createColumnHelper<any>();
export function filterCol(name: FilterKeys): FilterColumn {
    return columnHelper.accessor(name, {
        header: null,
        meta: { isHidden: true },
        enableColumnFilter: true,
        // isVisible: false,

        cell: () => null,
    });
}
function filterField(
    value: FilterKeys,
    type: "checkbox" | "input" = "input",
    options = [],
    label?,
) {
    // if (!label) label = label?.toLowerCase()?.replaceAll(" ", ".");
    return {
        [value]: {
            value,
            label,
            type,
            options,
        },
    };
}
export const filterFields: Partial<{
    [k in FilterKeys]: DataTableFilterField<any>;
}> = {
    ...filterField("customer.name"),
    ...filterField("address"),
    ...filterField("order.no"),
    ...filterField("po"),
    ...filterField("phone"),
    ...filterField("dispatch.status", "checkbox"),
    ...filterField("production.assignment", "checkbox"),
    ...filterField("production", "checkbox"),
    ...filterField("invoice", "checkbox"),
    ...filterField("sales.rep", "checkbox"),
    ...filterField("search"),
};
const getFilter = (k) => __filters()[k];
export const composeFilter = (queryKey: QueryKeys, loadedFilters?) => {
    const { fields, options } = getFilter(queryKey) || {};

    const f = fields?.map((filter: any) => {
        const filterData =
            loadedFilters?.[filter?.value] || options?.[filter?.value];
        if (filterData) {
            filter.options = filterData.map((value) => ({
                value,
                label: value,
            }));

            // .filter((a, b) => b < 10);
        }
        return filter;
    });

    return {
        queryKey,
        // queryParams,
        filterFields: f || [],
    };
};

const undotFilterKey = (k) => k?.split(".")?.join("_");
const dotFilterKey = (k) => k?.split("_")?.join(".");
export const __findFilterField = (field, filter) =>
    undotFilterKey(field?.value) == undotFilterKey(filter.id);

export const __getTableCol = (table, key) =>
    table.getColumn(dotFilterKey(key)) || table.getColumn(undotFilterKey(key));
export const __filterKeyInSearch = (id, data) =>
    dotFilterKey(id) in data || undotFilterKey(id) in data;
// export const __transformInputValue = (inputValue)
