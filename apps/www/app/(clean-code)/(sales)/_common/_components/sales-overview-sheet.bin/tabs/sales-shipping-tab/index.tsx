import Link from "next/link";
import { openSalesPrint } from "@/app/(v2)/printer/utils";
import { Icons } from "@/components/_v1/icons";
import { TCell } from "@/components/(clean-code)/data-table/table-cells";
import { Menu } from "@/components/(clean-code)/menu";
import { timeout } from "@/lib/timeout";
import { toast } from "sonner";

import { Button } from "@gnd/ui/button";
import {
    Table,
    TableBody,
    TableHead,
    TableHeader,
    TableRow,
} from "@gnd/ui/table";

import { deleteDispatchAction } from "../../../../data-actions/dispatch-actions/delete-dispatch-action";
import { resetSalesStatAction } from "../../../../data-actions/sales-stat-control.action";
import { refreshTabData } from "../../helper";
import { salesOverviewStore } from "../../store";

export function SalesShippingTab({}) {
    const store = salesOverviewStore();
    const shipping = store.shipping;
    if (!shipping) return null;
    return (
        <div className="flex-col gap-4">
            <div className="flex gap-4 border-b py-2">
                <div className="flex-1"></div>
                <Button
                    disabled={!shipping?.dispatches?.length}
                    asChild
                    size="xs"
                    variant="secondary"
                >
                    <Link
                        target="_blank"
                        href={`/printer/sales?slugs=${store.overview?.orderId}&mode=packing list&dispatchId=all`}
                    >
                        <Icons.print className="mr-2 size-4" />
                        <span>Print All</span>
                    </Link>
                </Button>
                <Button
                    onClick={() => {
                        store.update("currentTab", "shipping_form");
                    }}
                    size="xs"
                >
                    <Icons.add className="mr-2 size-4" />
                    <span>Create</span>
                </Button>
            </div>
            <div className="">
                <Table className="styled table-sm">
                    <TableHeader className="font-mono uppercase">
                        <TableHead>Date</TableHead>
                        <TableHead>Dispatch #</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>Assigned To</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead></TableHead>
                    </TableHeader>
                    <TableBody>
                        {shipping?.dispatches?.map((dispatch) => (
                            <TableRow key={dispatch.id}>
                                <TCell>
                                    <TCell.Date>{dispatch.date}</TCell.Date>
                                </TCell>
                                <TCell>
                                    <TCell.Primary>
                                        {dispatch.uid}
                                    </TCell.Primary>
                                </TCell>
                                <TCell>
                                    <TCell.Status
                                        status={dispatch.deliveryMode}
                                    />
                                </TCell>
                                <TCell>
                                    <TCell.Status
                                        status={dispatch.assignedTo?.name}
                                    />
                                </TCell>
                                <TCell>
                                    <TCell.Status status={dispatch.status} />
                                </TCell>
                                <TCell align="right" className="action">
                                    {/* <ConfirmBtn trash /> */}
                                    <Menu>
                                        <Menu.Item
                                            _blank
                                            onClick={() => {
                                                openSalesPrint({
                                                    slugs: store.overview
                                                        ?.orderId,
                                                    mode: "packing list",
                                                    dispatchId: dispatch.id,
                                                });
                                            }}
                                        >
                                            Print
                                        </Menu.Item>
                                        <Menu.Item>Status</Menu.Item>
                                        <Menu.Trash
                                            action={async () => {
                                                toast.promise(
                                                    async () => {
                                                        await deleteDispatchAction(
                                                            dispatch.id,
                                                        );
                                                        return true;
                                                    },
                                                    {
                                                        loading: "Deleting....",
                                                        async success(data) {
                                                            await timeout(1000);
                                                            await resetSalesStatAction(
                                                                store?.overview
                                                                    ?.id,
                                                            );
                                                            refreshTabData(
                                                                "shipping",
                                                            );
                                                            return "Deleted";
                                                            // toast.success(
                                                            //     "deleted!"
                                                            // );
                                                        },
                                                    },
                                                );
                                            }}
                                        >
                                            Delete
                                        </Menu.Trash>
                                    </Menu>
                                </TCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </div>
        </div>
    );
}
