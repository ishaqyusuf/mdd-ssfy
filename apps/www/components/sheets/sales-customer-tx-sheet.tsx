"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
    GetSalesCustomerTxOverview,
    getSalesCustomerTxOverviewAction,
} from "@/actions/get-customer-tx-action";

import Money from "../_v1/money";
import { TCell } from "../(clean-code)/data-table/table-cells";
import Modal from "../common/modal";
import { _modal } from "../common/modal/provider";
import { Table, TableBody, TableCell, TableRow } from "../ui/table";

export async function openSalesCustomerTx(tid) {
    // const res = await getSalesCustomerTxOverviewAction(tid);
    _modal.openSheet(<SalesCustomerTxSheet id={tid} />);
}

function SalesCustomerTxSheet({ id }) {
    const [data, setData] = useState<GetSalesCustomerTxOverview>();
    useEffect(() => {
        getSalesCustomerTxOverviewAction(id).then((result) => {
            setData(result);
        });
    }, [id]);

    return (
        <Modal.Content>
            <Modal.Header
                title={`${data?.wallet?.accountNo} | #${data?.id}`}
                subtitle={data?.squarePayment?.id ? "POS" : ""}
            />
            <Modal.ScrollArea className="h-[80vh]">
                <Table>
                    <TableBody>
                        {data?.salesPayments?.map((p) => (
                            <TableRow key={p.id}>
                                <TCell>
                                    <TCell.Date>{p.createdAt}</TCell.Date>
                                </TCell>
                                <TableCell>
                                    <Link
                                        target="_blank"
                                        href={`/sales-v2/overview/${p.order.type}/${p.order?.orderId}`}
                                    >
                                        <p>{p.order.orderId}</p>
                                        <p>{p.order.type}</p>
                                    </Link>
                                </TableCell>
                                {/* <TableCell>{}</TableCell> */}
                                <TableCell>
                                    <Money value={p.amount} />
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </Modal.ScrollArea>
        </Modal.Content>
    );
}
