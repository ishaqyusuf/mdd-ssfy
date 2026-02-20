"use client";

import { Table, useTableData } from "@gnd/ui/data-table";
import { useTRPC } from "@/trpc/client";
import { columns } from "./columns";
import { useSiteActionFilterParams } from "@/hooks/use-site-action-filter-params";
import { _trpc } from "@/components/static-trpc";
import { cn } from "@gnd/ui/cn";
import { getColorFromName } from "@gnd/utils/colors";
import { ArrowUpRight, DollarSign } from "lucide-react";
import { timeAgo } from "@gnd/utils/dayjs";
import { Item } from "@gnd/ui/namespace";

export function DataTable({}) {
    const trpc = useTRPC();
    const { filter, setFilter } = useSiteActionFilterParams();
    // const { ref, inView } = useInView();

    // const infiniteQueryOptions = trpc.siteActions.index.infiniteQueryOptions(
    //     {
    //         ...filter,
    //     },
    //     {
    //         getNextPageParam: ({ meta }) => {
    //             return (meta as any)?.cusor?.toString();
    //         },
    //     },
    // );
    // const { data, fetchNextPage, hasNextPage, isFetching } =
    //     useSuspenseInfiniteQuery(infiniteQueryOptions);
    // const tableData = useMemo(() => {
    //     return data?.pages.flatMap((page) => (page as any)?.data ?? []) ?? [];
    // }, [data]);
    // useEffect(() => {
    //     if (inView) {
    //         fetchNextPage();
    //     }
    // }, [inView]);
    const {
        data,
        ref: loadMoreRef,
        hasNextPage,
        isFetching,
    } = useTableData({
        filter: {
            ...filter,
            // ...(props.defaultFilters || {}),
            // bin: props.bin,
        },
        route: _trpc.siteActions.index,
    });
    return (
        <Table.Provider
            args={[
                {
                    columns,
                    // mobileColumn: mobileColumn,
                    data,
                    checkbox: true,
                    // tableScroll,
                    // rowSelection,
                    props: {
                        hasNextPage,
                        loadMoreRef,
                        // loadMoreRef: props.singlePage ? null : loadMoreRef,
                    },
                    //    setRowSelection,
                    tableMeta: {
                        rowClick(id, rowData) {
                            //    overviewQuery.open2(rowData.uuid, "sales");
                        },
                    },
                },
            ]}
        >
            <div className="flex flex-col gap-4 w-full">
                {/* <Table.SummaryHeader /> */}
                {data?.map((item, i) => {
                    const color = getColorFromName(item.event);
                    return (
                        <div
                            key={item.id}
                            className="relative pl-8 md:pl-12 group"
                        >
                            {/* Timeline Connector */}
                            <div
                                className={cn(`
                            absolute -left-[9px] top-0 w-5 h-5 rounded-full border-4 border-background flex items-center justify-center
                            `)}
                                // ${getStatusColors(item.status).replace("text-", "text-current ").split(" ")[0]}
                            >
                                {/* Inner dot handled by bg color */}
                            </div>

                            {/* Card Content */}
                            <div className="flex flex-col sm:flex-row gap-4 sm:items-start bg-card p-4 rounded-xl border border-border shadow-sm hover:shadow-md transition-all">
                                {/* Icon & User */}
                                <div className="flex items-center gap-3 min-w-[180px]">
                                    <div className="relative">
                                        {item.avatar ? (
                                            <img
                                                src={item.avatar}
                                                alt={item.user}
                                                className="w-10 h-10 rounded-full object-cover border border-border"
                                            />
                                        ) : (
                                            <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center text-muted-foreground font-bold border border-border">
                                                {item.user?.charAt(0) || "-"}
                                            </div>
                                        )}
                                        <div
                                            className={`absolute -bottom-1 -right-1 p-1 rounded-full border-2 border-card  `}
                                        >
                                            {/* {getIcon(item.action)} */}
                                        </div>
                                    </div>
                                    <div>
                                        <p className="text-sm font-bold text-foreground">
                                            {item.user}
                                        </p>
                                        <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                                            {item.role}
                                        </p>
                                    </div>
                                </div>

                                {/* Details */}
                                <div className="flex-1">
                                    <div className="flex justify-between items-start">
                                        <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-muted text-muted-foreground tracking-wide mb-1">
                                            {item.event}
                                        </span>
                                        <span className="text-xs text-muted-foreground font-medium whitespace-nowrap">
                                            {timeAgo(item.createdAt)}
                                        </span>
                                    </div>
                                    <Item.Title className="text-sm text-foreground font-medium leading-relaxed">
                                        {item.description}
                                    </Item.Title>
                                    <Item.Description className="text-sm text-foreground font-medium leading-relaxed">
                                        {item.meta?.description}
                                    </Item.Description>
                                    {/* {item.amount && (
                                        <div className="mt-2 inline-flex items-center gap-1.5 px-3 py-1 bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 rounded-md border border-green-100 dark:border-green-800 text-xs font-bold">
                                            <DollarSign size={12} />
                                            {item.amount}
                                        </div>
                                    )} */}
                                </div>

                                {/* Quick Action */}
                                <div className="self-center sm:self-start">
                                    <button className="p-2 hover:bg-muted rounded-lg text-muted-foreground hover:text-primary transition-colors">
                                        <ArrowUpRight size={18} />
                                    </button>
                                </div>
                            </div>
                        </div>
                    );
                })}
                {/* <div
                       ref={tableScroll.containerRef}
                       className="overflow-x-auto overscroll-x-none md:border-l md:border-r border-border scrollbar-hide"
                   >
                       <Table>
                           <Table.TableHeader />
                           <Table.Body>
                               <Table.TableRow />
                           </Table.Body>
                       </Table>
                   </div> */}
                <Table.LoadMore />
                {/* <BatchActions /> */}
            </div>
        </Table.Provider>
    );
    // return (
    //     <TableProvider
    //         args={[
    //             {
    //                 columns: columns,
    //                 data: tableData,
    //                 // hasNextPage,
    //                 // loadMore,
    //                 // pageSize,
    //                 // setParams,
    //                 // params,
    //                 tableMeta: {
    //                     deleteAction(id) {
    //                         // deleteStudent.execute({
    //                         //   studentId: id,
    //                         // });
    //                     },
    //                     rowClick(id, rowData) {
    //                         // setParams({
    //                         //     studentViewId: id,
    //                         // });
    //                     },
    //                 },
    //             },
    //         ]}
    //     >
    //         <div className="flex flex-col gap-4">
    //             <Table>
    //                 <TableHeaderComponent />

    //                 <TableBody>
    //                     <TableRow />
    //                 </TableBody>
    //             </Table>
    //             <LoadMore ref={ref} hasNextPage={hasNextPage} />
    //         </div>
    //     </TableProvider>
    // );
}
