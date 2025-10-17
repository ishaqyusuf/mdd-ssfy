import { DataTableLoading } from "@/components/_v1/data-table/data-table-loading";

export default function ProductsLoading() {
    return (
        <DataTableLoading
            columnCount={6}
            isNewRowCreatable={true}
            isRowsDeletable={true}
        />
    );
}
