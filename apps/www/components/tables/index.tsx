"use client";
import { useEffect, useState } from "react";
import { createContextFactory } from "@/utils/context-factory";
import {
    getCoreRowModel,
    getFilteredRowModel,
    useReactTable,
} from "@tanstack/react-table";
import { useInView } from "react-intersection-observer";
import { PageDataMeta, PageFilterData } from "@/types/type";
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
    nextMeta?: PageDataMeta["next"];
    columns?;
    checkbox?: boolean;
    tableMeta?: {
        deleteAction?: (id) => any;
        rowClick?: (id: string, rowData?) => any;
        loadMore?;
        filterData?: PageFilterData[];
        rowClassName?: string;
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
        nextMeta: nextPageMeta,
        loadMore,
        checkbox,
    }: TableProps) {
        const [data, setData] = useState(initialData);
        // const [from, setFrom] = useState(pageSize);
        const { ref, inView } = useInView();
        const [nextMeta, setNextMeta] = useState(nextPageMeta);
        const loadMoreData = async () => {
            // const formatedFrom = from;
            // const to = formatedFrom + pageSize * 2;

            try {
                const { data, meta } = await loadMore({
                    ...nextMeta,
                });
                console.log({ nextMeta });

                let _meta = meta as PageDataMeta;
                setData((prev) => [...prev, ...data]);
                // setFrom(to);
                setNextMeta(_meta?.next);
            } catch {
                setNextMeta(null);
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
            moreRef: ref,
            hasMore: !!nextMeta,
        };
    });
