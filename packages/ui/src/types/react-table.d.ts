declare module "@tanstack/table-core" {
  interface TableMeta<TData extends RowData> {}
  interface ColumnMeta<TData extends RowData, TValue> {
    preventDefault?: boolean;
    actionCell?: boolean;
    className?: string;
  }
  export {
    getCoreRowModel,
    getFilteredRowModel,
    RowSelectionState,
    type VisibilityState,
  };
}
