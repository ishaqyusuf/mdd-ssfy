"use client";

import { TransactionsTab } from "@/components/sheets/customer-overview-sheet/transactions-tab";

import { salesOverviewStore } from "../store";

export function TransactionHistoryTab() {
    return <TransactionsTab salesId={salesOverviewStore().salesId} />;
    // const store = salesOverviewStore();
    // const ctx = useEffectLoader(
    //     async () =>
    //         getSalesPaymentsAction({
    //             "sales.id": store.salesId,
    //         }),
    //     {
    //         onSuccess(data) {
    //             console.log(data);
    //         },
    //     },
    // );
    // async function deleteTransaction(id) {
    //     //
    // }
    // if (!ctx?.data?.length) return <NoResults />;
    // return (
    //     <div>
    //         <Table>
    //             <TableHeader>
    //                 <TableRow>
    //                     <TableHead>Date</TableHead>
    //                     <TableHead>Payment Method</TableHead>
    //                     {/* <TableHead>Processed By</TableHead> */}
    //                     <TableHead>Amount</TableHead>
    //                     <TableHead>Status</TableHead>
    //                     <TableHead></TableHead>
    //                 </TableRow>
    //             </TableHeader>
    //             <TableBody>
    //                 {ctx.data?.map((tx) => (
    //                     <TableRow key={tx.paymentId}>
    //                         <TableCell>
    //                             {/* <TCell.Primary>{tx.paymentId}</TCell.Primary> */}
    //                             <TCell.Date>{tx.date}</TCell.Date>
    //                         </TableCell>
    //                         <TableCell>
    //                             <TCell.Secondary>
    //                                 <span>{tx.note}</span>
    //                             </TCell.Secondary>
    //                             <TCell.Secondary>
    //                                 <Badge
    //                                     variant="secondary"
    //                                     className="px-1 py-0 uppercase"
    //                                 >
    //                                     {tx.paymentMethod}
    //                                 </Badge>
    //                                 {!tx.receivedBy || (
    //                                     <>
    //                                         {" by "}
    //                                         {tx.receivedBy}
    //                                     </>
    //                                 )}
    //                             </TCell.Secondary>
    //                         </TableCell>
    //                         {/* <TableCell>
    //                             <>{tx.receivedBy}</>
    //                         </TableCell> */}
    //                         <TableCell>
    //                             <Money value={Math.abs(tx.amount)} />
    //                         </TableCell>
    //                         <TableCell>
    //                             <TCell.Status status={tx.status} />
    //                         </TableCell>
    //                         <TableCell>
    //                             <ConfirmBtn
    //                                 onClick={() => deleteTransaction(tx.id)}
    //                             />
    //                         </TableCell>
    //                     </TableRow>
    //                 ))}
    //             </TableBody>
    //         </Table>
    //     </div>
    // );
}
