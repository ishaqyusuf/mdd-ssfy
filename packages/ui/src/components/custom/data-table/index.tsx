"use client";
import {
	useCallback,
	useDeferredValue,
	useEffect,
	useMemo,
	useRef,
	useState,
} from "react";
import createContextFactory from "@gnd/ui/utils/context-factory";
import {
	getCoreRowModel,
	getFilteredRowModel,
	type RowSelectionState,
	useReactTable,
} from "@tanstack/react-table";
import { useInView } from "react-intersection-observer";
// import { PageDataMeta, PageFilterData } from "@/types/type";
import type { PageFilterData } from "@gnd/utils/types";
import { useSuspenseInfiniteQuery } from "@tanstack/react-query";
// import { useTableScroll } from "@gnd/ui/hooks/use-table-scroll";
// import { screens } from "@/lib/responsive";
import { useMediaQuery } from "react-responsive";
import type { PageDataMeta } from "@gnd/utils/query-response";
import { screens } from "@gnd/utils/responsive";
import type { useTableScroll } from "../../../hooks/use-table-scroll";
import { TableRow } from "./table-row";
import { TableHeader } from "./table-header";
import { TableBody } from "./table-body";
import {
	Table as BaseTable,
	TableRow as _Row,
	TableCell as _Cell,
	TableHeader as _Header,
	TableHead as _Head,
} from "../../table";
import { LoadMoreTRPC } from "./load-more";
import Portal from "../portal";

type InfiniteTableMeta = {
	cursor?: unknown;
	count?: number;
	size?: number;
};

type TableDataWithMeta<T = unknown> = T[] & {
	meta?: InfiniteTableMeta;
};

function useInfinitePaginationTracker({
	enabled,
	pageSize,
	rowCount,
}: {
	enabled: boolean;
	pageSize: number;
	rowCount: number;
}) {
	const rowNodesRef = useRef(new Map<number, HTMLTableRowElement>());
	const frameRef = useRef<number | null>(null);
	const [visibleRange, setVisibleRange] = useState({
		start: 0,
		end: Math.max(0, Math.min(pageSize, rowCount) - 1),
	});

	const measureRows = useCallback(() => {
		frameRef.current = null;

		if (!enabled || rowCount <= 0) {
			setVisibleRange({ start: 0, end: 0 });
			return;
		}

		const rows = [...rowNodesRef.current.entries()].sort((a, b) => a[0] - b[0]);
		if (!rows.length) return;

		const viewportTop = 0;
		const viewportBottom = window.innerHeight;

		const visibleRows = rows.filter(([, node]) => {
			const rect = node.getBoundingClientRect();
			return rect.bottom > viewportTop && rect.top < viewportBottom;
		});

		if (visibleRows.length) {
			setVisibleRange({
				start: visibleRows[0]?.[0] ?? 0,
				end: visibleRows[visibleRows.length - 1]?.[0] ?? 0,
			});
			return;
		}

		const nextVisibleRow =
			rows.find(
				([, node]) => node.getBoundingClientRect().bottom >= viewportTop,
			) ?? rows[rows.length - 1];

		const fallbackStart = nextVisibleRow?.[0] ?? 0;
		setVisibleRange({
			start: fallbackStart,
			end: Math.min(rowCount - 1, fallbackStart + Math.max(pageSize - 1, 0)),
		});
	}, [enabled, pageSize, rowCount]);

	const scheduleMeasure = useCallback(() => {
		if (!enabled) return;
		if (frameRef.current != null) cancelAnimationFrame(frameRef.current);
		frameRef.current = window.requestAnimationFrame(measureRows);
	}, [enabled, measureRows]);

	const registerRow = useCallback(
		(rowIndex: number) => (node: HTMLTableRowElement | null) => {
			if (node) rowNodesRef.current.set(rowIndex, node);
			else rowNodesRef.current.delete(rowIndex);
			scheduleMeasure();
		},
		[scheduleMeasure],
	);

	useEffect(() => {
		if (!enabled) return;

		const handleMeasure = () => {
			scheduleMeasure();
		};

		window.addEventListener("scroll", handleMeasure, { passive: true });
		window.addEventListener("resize", handleMeasure);
		handleMeasure();

		return () => {
			window.removeEventListener("scroll", handleMeasure);
			window.removeEventListener("resize", handleMeasure);
			if (frameRef.current != null) cancelAnimationFrame(frameRef.current);
		};
	}, [enabled, scheduleMeasure]);

	useEffect(() => {
		scheduleMeasure();
	}, [rowCount, pageSize, scheduleMeasure]);

	const activePage = Math.max(1, Math.floor(visibleRange.start / pageSize) + 1);

	return {
		activePage,
		registerRow,
		visibleRange,
	};
}

export type DataTableProps = {
	data: any[];
	loadMore?: (query) => Promise<any>;
	pageSize?: number;
	hasNextPage?: boolean;
	filterDataPromise?;
};
type WithTable = {
	// table: ReturnType<typeof useReactTable<any>>;
	data?: any;
};

// type WithoutTable = {
//   table?: null;
//   data: any;
// };

type TableProps = WithTable & {
	// type TableProps = (WithTable | WithoutTable) & {
	setParams?;
	params?;
	loadMore?;
	pageSize?;
	nextMeta?: PageDataMeta["next"];
	columns?;
	mobileColumn?;
	route?;
	filter?;
	checkbox?: boolean;
	addons?;
	props?: {
		hasNextPage;
		loadMoreRef;
		totalResults?;
		pageSize?;
		cursor?;
	};
	tableScroll?: ReturnType<typeof useTableScroll>;
	tableMeta?: {
		extras?: any;
		deleteAction?: (id) => any;
		hidePagination?: boolean;
		rowClick?: (id: string, rowData?) => any;
		loadMore?;
		filterData?: PageFilterData[];
		rowClassName?: string;
		mobileMode?: {
			hideHeader?: boolean;
			borderless?: boolean;
		};
	};
	rowSelection?;
	setRowSelection?;
	defaultRowSelection?: RowSelectionState;
};
export function createTableContext({
	// table,
	setParams,
	params,
	data: initialData,
	columns,
	mobileColumn,
	tableMeta,
	pageSize,
	nextMeta: nextPageMeta,
	loadMore,
	checkbox,
	defaultRowSelection = {},
	addons,
	tableScroll,
	data,
	rowSelection: storeRowSelection,
	setRowSelection: storeSetRowSelection,
	route,
	filter,
	props,
}: TableProps) {
	const { ref, inView } = useInView();
	const [nextMeta, setNextMeta] = useState(nextPageMeta);
	const isMobile = useMediaQuery(screens.xs);
	const dataMeta = (data as TableDataWithMeta | undefined)?.meta;

	const [__rowSelection, __setRowSelection] =
		useState<RowSelectionState>(defaultRowSelection);
	const [hasBatchAction, setHasBatchAction] = useState(false);
	const [rowSelection, setRowSelection] = [
		storeRowSelection || __rowSelection,
		storeSetRowSelection || __setRowSelection,
	];
	const usingMobileColumn = Boolean(isMobile && mobileColumn);

	const table = useReactTable({
		data,
		getRowId: ({ id }) => String(id),
		columns: usingMobileColumn ? mobileColumn : columns,
		getCoreRowModel: getCoreRowModel(),
		getFilteredRowModel: getFilteredRowModel(),
		onRowSelectionChange: setRowSelection || undefined,
		meta: tableMeta,
		enableMultiRowSelection: checkbox,
		manualFiltering: true,
		state: {
			rowSelection,
		},
	});
	const totalRowsFetched = data?.length;
	const resolvedPageSize = Math.max(
		1,
		props?.pageSize || pageSize || dataMeta?.size || totalRowsFetched || 1,
	);
	const totalResults = Math.max(
		totalRowsFetched || 0,
		props?.totalResults || dataMeta?.count || totalRowsFetched || 0,
	);
	const pagination = useInfinitePaginationTracker({
		enabled: !isMobile && totalRowsFetched > 0,
		pageSize: resolvedPageSize,
		rowCount: totalRowsFetched || 0,
	});
	const selectedRows = useMemo(() => {
		const selectedRowKey = Object.keys(rowSelection || {});
		return table
			.getCoreRowModel()
			.flatRows.filter((row) => selectedRowKey.includes(row.id));
	}, [rowSelection, table]);
	const selectedRow = useMemo(() => {
		const selectedRowKey = Object.keys(rowSelection || {})?.[0];
		return table
			.getCoreRowModel()
			.flatRows.find((row) => row.id === selectedRowKey);
	}, [rowSelection, table]);
	return {
		table,
		setParams,
		params,
		tableMeta,
		// loadMoreData,
		checkbox: checkbox && mobileColumn && isMobile ? false : checkbox,
		moreRef: ref,
		hasMore: !!nextMeta,
		selectedRows,
		selectedRow,
		totalRowsFetched,
		addons,
		tableScroll,
		props,
		hasBatchAction,
		setHasBatchAction,
		pagination: {
			activePage: pagination.activePage,
			pageCount: Math.max(1, Math.ceil(totalResults / resolvedPageSize)),
			pageSize: resolvedPageSize,
			totalResults,
			hidden: tableMeta?.hidePagination === true,
			visibleRowEnd: pagination.visibleRange.end,
			visibleRowStart: pagination.visibleRange.start,
			registerRow: pagination.registerRow,
			cursor: props?.cursor || dataMeta?.cursor,
		},
		usingMobileColumn,
		mobileMode: {
			hideHeader: true, //isMobile && !!tableMeta?.mobileMode?.hideHeader,
			borderless: true, // isMobile && !!tableMeta?.mobileMode?.borderless,
		},
	};
}
export const {
	useContext: useTable,
	Provider: TableProvider,
	Context,
} = createContextFactory(createTableContext);

export const useTableData = ({ filter, route }) => {
	// const trpc = useTRPC();
	const { ref, inView } = useInView();

	const deferredSearch = useDeferredValue(filter.q);

	const infiniteQueryOptions = route?.infiniteQueryOptions(
		{
			...filter,
			q: deferredSearch,
		},
		{
			getNextPageParam: ({ meta }) => {
				return meta?.cursor;
			},
		},
	);
	const { data, fetchNextPage, hasNextPage, isFetching } =
		useSuspenseInfiniteQuery(infiniteQueryOptions);
	const tableData = useMemo(() => {
		const list =
			data?.pages.flatMap((page) => {
				return (page as any)?.data ?? [];
			}) ?? [];
		const meta = ([...(data?.pages || [])]?.reverse()?.[0] as any)?.meta;
		const { cursor, count, size } = meta || {};
		const dataWithMeta = Object.assign(list, {
			meta: {
				cursor,
				count,
				size,
			},
		}) as TableDataWithMeta;
		return {
			data: dataWithMeta,
			resultCount: cursor,
			total: count,
			pageSize: size,
			meta: {
				cursor,
				count,
				size,
			},
		};
	}, [data]);

	useEffect(() => {
		if (inView) {
			fetchNextPage();
		}
	}, [inView]);
	return {
		ref,
		// data: tableData,
		...tableData,
		queryData: data,
		hasNextPage,
		isFetching,
		// from: data?.
	};
};
function SummarySlot() {
	return <div id="summary-slot" className="flex items-center gap-4"></div>;
}
function SummaryHeader() {
	const t = useTable();
	return (
		<Portal nodeId={`summary-slot`}>
			<span>ab</span>
		</Portal>
	);
}
export const Table = Object.assign(BaseTable, {
	Provider: TableProvider,
	ContextProvider: Context?.Provider,
	TableRow,
	TableHeader,
	Body: TableBody,
	Row: _Row,
	Head: _Head,
	Header: _Header,
	Cell: _Cell,
	LoadMore: LoadMoreTRPC,
	SummarySlot,
	SummaryHeader,
});
