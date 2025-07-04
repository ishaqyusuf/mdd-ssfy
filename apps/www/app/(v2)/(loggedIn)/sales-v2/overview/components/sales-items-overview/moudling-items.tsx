import Money from "@/components/_v1/money";
import { useDataPage } from "@/lib/data-page-context";

import { Label } from "@gnd/ui/label";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@gnd/ui/table";

import { SalesOverviewType } from "../overview-shell";

export default function MouldingItems() {
    const { data } = useDataPage<SalesOverviewType>();
    if (!data.groupings.mouldings?.length) return <></>;
    return data.groupings.mouldings.map((moulding, index) => (
        <div key={index}>
            <div className="border-b bg-blue-50 p-2 uppercase">
                <Label>Mouldings</Label>
            </div>
            <Table>
                <TableHeader>
                    <TableHead>#</TableHead>
                    <TableHead>Moulding</TableHead>
                    <TableHead>Qty</TableHead>
                    <TableHead>Rate</TableHead>
                    <TableHead>Total</TableHead>
                </TableHeader>
                <TableBody>
                    {moulding.multiDykeComponents.map((com, cid) => (
                        <TableRow key={com.id}>
                            <TableCell>{cid + 1}</TableCell>
                            <TableCell>
                                {com.housePackageTool?.molding?.title}
                            </TableCell>
                            <TableCell>{com.qty}</TableCell>
                            <TableCell>
                                <Money value={com.rate} />
                            </TableCell>
                            <TableCell>
                                <Money value={com.total} />
                            </TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
        </div>
    ));
}
