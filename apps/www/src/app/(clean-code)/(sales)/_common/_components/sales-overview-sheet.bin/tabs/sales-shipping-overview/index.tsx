import Link from "@/components/link";
import { Icons } from "@/components/_v1/icons";
import { TCell } from "@/components/(clean-code)/data-table/table-cells";
import { Menu } from "@/components/(clean-code)/menu";
import Button from "@/components/common/button";

import {
    Table,
    TableBody,
    TableHead,
    TableHeader,
    TableRow,
} from "@gnd/ui/table";

import { salesOverviewStore } from "../../store";

export function SalesShippingOverview({}) {
    const store = salesOverviewStore();
    const shipping = store.shipping;
    if (!shipping) return null;
    return (
        <div className="flex-col gap-4">
            <div className="flex gap-4 border-b py-2">
                <div className="flex-1"></div>
                <Button asChild size="xs" variant="secondary">
                    <Link href={``}>
                        <Icons.print className="mr-2 size-4" />
                        <span>Print Alls</span>
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
                                        <Menu.Item>Print</Menu.Item>
                                        <Menu.Item>Status</Menu.Item>
                                        <Menu.Trash>Delete</Menu.Trash>
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
