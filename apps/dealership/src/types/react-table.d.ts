import "@tanstack/react-table";

declare module "@tanstack/react-table" {
	interface ColumnMeta<TData extends RowData, TValue> {
		sortable?: boolean;
		preventDefault?: boolean;
		actionCell?: boolean;
		className?: string;
	}

	interface RowData {
		id?: string | number;
	}
}
