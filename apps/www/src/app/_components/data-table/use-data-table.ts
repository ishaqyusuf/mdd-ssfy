import { useDebounce } from "@/hooks/use-debounce";
import { formatDate } from "@/lib/use-day";
import useQueryParams from "@/lib/use-query-params";
import {
    ColumnFiltersState,
    PaginationState,
    SortingState,
    VisibilityState,
    getCoreRowModel,
    getFacetedRowModel,
    getFacetedUniqueValues,
    getFilteredRowModel,
    getPaginationRowModel,
    getSortedRowModel,
    useReactTable,
} from "@tanstack/react-table";
import { ReadonlyURLSearchParams, useSearchParams } from "next/navigation";
import qs from "qs";
import React, { createContext, useContext } from "react";

export const dataTableContext = createContext({});
export const dataTableRowContext = createContext({});
export type DataTableType = ReturnType<typeof useDataTable>;
export type TableRowModel = ReturnType<
    DataTableType["table"]["getRowModel"]
>["rows"][number];
export const useDataTableContext = (): DataTableType =>
    useContext(dataTableContext) as any;
export const useTRContext = (): DataTableType =>
    useContext(dataTableRowContext) as any;

export function useDataTable(
    data,
    columns,
    pageCount,
    cellVariants,
    addFilterCol
) {
    const [rowSelection, setRowSelection] = React.useState({});
    const [columnVisibility, setColumnVisibility] =
        React.useState<VisibilityState>({});
    const [columnFilters, setColumnFilters] =
        React.useState<ColumnFiltersState>([]);
    // React.useEffect(() => {
    //     console.log(_searchParams);
    // }, []);

    function __updateQuery(q) {
        setDataQueryString(qs.stringify(q));
    }
    // const [dataQuery, setDataQuery] = React.useState({});
    const [dataQueryString, setDataQueryString] = React.useState("");
    const [items, setItems] = React.useState([]);
    // const [_pageCount, setPageCount] = React.useState(0);
    const [isFiltered, setIsFiltered] = React.useState(false);
    const [initialized, setInitialized] = React.useState(false);
    const [sorting, setSorting] = React.useState<SortingState>([]);
    const [pagination, setPagination] = React.useState<PaginationState>({
        pageIndex: 0,
        pageSize: 1,
    });
    // React.useEffect(() => {
    //     // setItems(data);
    //     // setPageCount(pageInfo?.pageCount || 0);
    // }, [data, pageInfo]);

    const debouncedQuery = useDebounce(dataQueryString, 800);

    const { queryParams, setQueryParams } = useQueryParams();
    React.useEffect(() => {
        setQueryParams(qs.parse(debouncedQuery), true);
    }, [debouncedQuery]);
    function updateDataQuery(_sorting, cFilters, pag) {
        const params: any = {};
        params.page = pag.pageIndex + 1;
        cFilters.map((f) => {
            if (f.value) {
                if (f.id == "_date") {
                    if (f.value instanceof Date)
                        params.date = formatDate(f.value, "YYYY-MM-DD");
                    else {
                        const { from, to } = f.value;
                        params.from = formatDate(from, "YYYY-MM-DD");
                        params.to = formatDate(to, "YYYY-MM-DD");
                    }
                } else params[f.id] = f.value; //Array.isArray(f.value) ? f.value.join(",") : f.value;
            }
        });
        _sorting.map(({ id, desc }) => {
            if (!id) return;
            params.sort = id;
            params.sort_order = desc ? "desc" : "asc";
        });
        setIsFiltered(cFilters.length > 0);
        __updateQuery(params);
    }
    const table = useReactTable({
        data,
        columns,
        state: {
            sorting,
            pagination,
            columnVisibility,
            rowSelection,
            columnFilters,
        },
        pageCount: pageCount ?? -1,
        enableRowSelection: true,
        onRowSelectionChange: setRowSelection,
        onSortingChange(e: any) {
            setSorting(e);
            setPagination({
                ...pagination,
                pageIndex: 0,
            });
            updateDataQuery(e(), columnFilters, { pageIndex: 0 });
        },
        onColumnFiltersChange(e: any) {
            setColumnFilters(e);
            setPagination({
                ...pagination,
                pageIndex: 0,
            });
            updateDataQuery(sorting, e(columnFilters), { pageIndex: 0 });
        },
        onPaginationChange(e: any) {
            setPagination(e);
            updateDataQuery(sorting, columnFilters, e(pagination));
        },
        manualSorting: true,
        manualFiltering: true,
        manualPagination: true,
        onColumnVisibilityChange: setColumnVisibility,
        getCoreRowModel: getCoreRowModel(),
        getFilteredRowModel: getFilteredRowModel(),
        getPaginationRowModel: getPaginationRowModel(),
        getSortedRowModel: getSortedRowModel(),
        getFacetedRowModel: getFacetedRowModel(),
        getFacetedUniqueValues: getFacetedUniqueValues(),
    });

    function __boot(searchParams: ReadonlyURLSearchParams) {
        const _q: any = {};
        const filter: ColumnFiltersState = [];
        // let page: any = 0;
        const _params: any = {};
        searchParams.forEach((v, k) => (_params[k] = v));

        const {
            date,
            from,
            to,
            sort_order,
            page,
            // per_page = 25,
            sort: __sort,
            ...params
        } = _params;
        // params.per_page = +(params.per_page || 25);
        _q.page = page ? +page : 1;
        let sort: { id?; desc? } = __sort
            ? {
                  id: __sort,
                  desc: sort_order == "desc",
              }
            : {};
        if (date)
            filter.push({
                id: "_date",
                value: new Date(date),
            });
        if (from && to)
            filter.push({
                id: "_date",
                value: {
                    from: new Date(from),
                    to: new Date(to),
                },
            });
        [{ date, from, to }, params].map((e, i) =>
            Object.entries(e).map(([k, v]) => {
                if (!v) {
                    return;
                } else {
                    let __value =
                        typeof v === "string" ? (v as any)?.split(",") : [v];
                    let value = __value.length > 1 ? __value : __value[0];
                    if (i == 1) {
                        filter.push({
                            id: k as any,
                            value,
                        });
                    }
                    _q[k as any] = value;
                }
            })
        );
        // const _filtered = filters.
        if (sort.id) {
            _q.sort = sort.id;
            _q.sort_order = sort_order;
        }
        setSorting([sort as any]);
        setColumnFilters(filter as any);
        setIsFiltered(filter.length > 0);

        setPagination({
            ...pagination,
            pageIndex: _q.page - 1,
            pageSize: 20, //_q.per_page || 20,
        });

        __updateQuery(_q);
        setInitialized(true);
    }

    const searchParams = useSearchParams();
    React.useEffect(() => {
        __boot(searchParams);
    }, []);

    return {
        table,
        columns,
        cellVariants,
        addFilterCol,
    };
}
