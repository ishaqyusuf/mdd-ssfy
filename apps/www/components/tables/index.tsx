"use client";
import { useEffect, useState } from "react";
import { createContextFactory } from "@/utils/context-factory";
import {
    getCoreRowModel,
    getFilteredRowModel,
    useReactTable,
} from "@tanstack/react-table";
import { useInView } from "react-intersection-observer";
export type DataTableProps = {
    data: any[];
    loadMore?: (query) => Promise<any>;
    pageSize?: number;
    hasNextPage?: boolean;
    filterDataPromise?;
};
type WithTable = {
    table: ReturnType<typeof useReactTable<any>>;
    data?: any;
};

type WithoutTable = {
    table?: null;
    data: any;
};

type TableProps = (WithTable | WithoutTable) & {
    setParams?;
    params?;
    loadMore?;
    pageSize?;
    hasNextPage?;
    columns?;
    checkbox?: boolean;
    tableMeta?: {
        deleteAction?: (id) => any;
        rowClick?: (id: string, rowData?) => any;
        loadMore?;
    };
};
export const { useContext: useTable, Provider: TableProvider } =
    createContextFactory(function ({
        table,
        setParams,
        params,
        data: initialData,
        columns,
        tableMeta,
        pageSize,
        hasNextPage: initialHasNextPage,
        loadMore,
        checkbox,
    }: TableProps) {
        const [data, setData] = useState(initialData);
        const [from, setFrom] = useState(pageSize);
        const { ref, inView } = useInView();
        const [hasNextPage, setHasNextPage] = useState(initialHasNextPage);
        const loadMoreData = async () => {
            const formatedFrom = from;
            const to = formatedFrom + pageSize * 2;

            try {
                const { data, meta } = await loadMore({
                    from: formatedFrom,
                    to,
                });

                setData((prev) => [...prev, ...data]);
                setFrom(to);
                setHasNextPage(meta.count > to);
            } catch {
                setHasNextPage(false);
            }
        };
        useEffect(() => {
            if (inView) {
                loadMoreData();
            }
        }, [inView]);

        useEffect(() => {
            setData(initialData);
        }, [initialData]);
        table = useReactTable({
            data,
            getRowId: ({ id }) => id,
            columns,
            getCoreRowModel: getCoreRowModel(),
            getFilteredRowModel: getFilteredRowModel(),
            meta: tableMeta,
        });
        return {
            table,
            setParams,
            params,
            tableMeta,
            loadMoreData,
            checkbox,
        };
    });
