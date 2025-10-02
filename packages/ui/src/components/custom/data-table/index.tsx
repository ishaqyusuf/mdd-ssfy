"use client";
import {
  createContext,
  memo,
  useContext,
  useDeferredValue,
  useEffect,
  useMemo,
  useState,
} from "react";
import createContextFactory from "@/utils/context-factory";
import {
  getCoreRowModel,
  getFilteredRowModel,
  RowSelectionState,
  useReactTable,
} from "@tanstack/react-table";
import { useInView } from "react-intersection-observer";
// import { PageDataMeta, PageFilterData } from "@/types/type";
import { PageFilterData } from "@gnd/utils/types";
import { useSuspenseInfiniteQuery } from "@tanstack/react-query";
// import { useTableScroll } from "@/hooks/use-table-scroll";
// import { screens } from "@/lib/responsive";
import { useMediaQuery } from "react-responsive";
import { PageDataMeta } from "@gnd/utils/query-response";
import { screens } from "@gnd/utils/responsive";
import { useTableScroll } from "../../../hooks/use-table-scroll";
import { TableRow } from "./table-row";
import { TableHeader } from "./table-header";
import {
  Table as BaseTable,
  TableBody as _Body,
  TableRow as _Row,
  TableCell as _Cell,
  TableHeader as _Header,
  TableHead as _Head,
} from "../../table";
import { LoadMoreTRPC } from "./load-more";
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
  mobileColumn?;
  checkbox?: boolean;
  addons?;
  props?: {
    hasNextPage;
    loadMoreRef;
  };
  tableScroll?: ReturnType<typeof useTableScroll>;
  tableMeta?: {
    deleteAction?: (id) => any;
    rowClick?: (id: string, rowData?) => any;
    loadMore?;
    filterData?: PageFilterData[];
    rowClassName?: string;
  };
  rowSelection?;
  setRowSelection?;
  defaultRowSelection?: RowSelectionState;
};

type TableContext = ReturnType<typeof createTableContext>;
export const TableContext = createContext<TableContext>(undefined);
export const TableProvider = TableContext.Provider;
export const createTableContext = (_props: TableProps) => {
  let {
    table,
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
    rowSelection: storeRowSelection,
    setRowSelection: storeSetRowSelection,
    props,
  } = _props;
  const [data, setData] = useState(initialData);
  // const [from, setFrom] = useState(pageSize);
  const { ref, inView } = useInView();
  const [nextMeta, setNextMeta] = useState(nextPageMeta);
  const isMobile = useMediaQuery(screens.xs);
  const loadMoreData = async () => {
    // const formatedFrom = from;
    // const to = formatedFrom + pageSize * 2;

    try {
      const { data, meta } = await loadMore({
        ...nextMeta,
      });

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
  const [__rowSelection, __setRowSelection] =
    useState<RowSelectionState>(defaultRowSelection);
  const [rowSelection, setRowSelection] = [
    storeRowSelection || __rowSelection,
    storeSetRowSelection || __setRowSelection,
  ];

  table = useReactTable({
    data,
    getRowId: ({ id }) => String(id),
    columns: isMobile && mobileColumn ? mobileColumn : columns,
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
    loadMoreData,
    checkbox: checkbox && mobileColumn && isMobile ? false : checkbox,
    moreRef: ref,
    hasMore: !!nextMeta,
    selectedRows,
    selectedRow,
    totalRowsFetched,
    addons,
    tableScroll,
    props,
  };
};
export const useTable = () => {
  const context = useContext(TableContext);
  if (context === undefined) {
    throw new Error("useTableContext must be used within a TableProvider");
  }
  return context;
};

export const useTableData = ({ filter, route }) => {
  // const trpc = useTRPC();
  const { ref, inView } = useInView();

  const deferredSearch = useDeferredValue(filter.q);

  const infiniteQueryOptions = route.infiniteQueryOptions(
    {
      ...filter,
      q: deferredSearch,
    },
    {
      getNextPageParam: ({ meta }) => {
        return meta?.cursor ?? undefined;
      },
    }
  );
  const { data, fetchNextPage, hasNextPage, isFetching } =
    useSuspenseInfiniteQuery(infiniteQueryOptions);
  const tableData = useMemo(() => {
    const list =
      data?.pages.flatMap((page) => {
        return (page as any)?.data ?? [];
      }) ?? [];
    const meta = (data?.pages?.reverse()?.[0] as any)?.meta;
    const { cursor, count } = meta || {};
    return {
      data: list,
      resultCount: cursor,
      total: count,
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

export const Table = Object.assign(BaseTable, {
  Provider: TableProvider,
  TableRow,
  TableHeader,
  Body: _Body,
  Row: _Row,
  Head: _Head,
  Header: _Header,
  Cell: _Cell,
  LoadMore: LoadMoreTRPC,
});
