import { useState } from "react";
import {
    getCoreRowModel,
    getFilteredRowModel,
    useReactTable,
} from "@tanstack/react-table";
import { useInView } from "react-intersection-observer";

interface Props {
    initialData;
    pageSize?;
    initialHasNextPage?;
    loadMore?;
    columns;
}
export function useSimpleTable({
    initialData,
    pageSize,
    columns,
    initialHasNextPage,
}: Props) {
    const [data, setData] = useState(initialData);
    const [from, setFrom] = useState(pageSize);
    const { ref, inView } = useInView();
    const [hasNextPage, setHasNextPage] = useState(initialHasNextPage);

    const table = useReactTable({
        data,
        getRowId: ({ id }) => id,
        columns,
        getCoreRowModel: getCoreRowModel(),
        getFilteredRowModel: getFilteredRowModel(),
        meta: {
            // deleteInvoice: handleDeleteInvoice,
            // dateFormat,
        },
    });

    return {
        table,
    };
}
