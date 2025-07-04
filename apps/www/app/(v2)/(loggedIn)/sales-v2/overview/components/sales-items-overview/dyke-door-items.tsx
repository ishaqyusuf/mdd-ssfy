import Money from "@/components/_v1/money";
import { TableCol } from "@/components/common/data-table/table-cells";
import { useDataPage } from "@/lib/data-page-context";
import { inToFt } from "@/lib/utils";

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

export default function DykeDoorItems() {
    const { data } = useDataPage<SalesOverviewType>();
    // console.log(data);
    if (!data.groupings.doors?.length) return <></>;
    return data.groupings.doors.map((moulding, index) => (
        <div key={index}>
            <div className="border-b bg-blue-50 p-2 uppercase">
                <Label>
                    {moulding.meta.doorType} Door: Section {index + 1}
                </Label>
            </div>
            <Table>
                <TableHeader>
                    <TableHead>#</TableHead>
                    <TableHead>Item</TableHead>
                    {moulding.isType.hasSwing && (
                        <>
                            <TableHead>Swing</TableHead>
                        </>
                    )}
                    {moulding.isType.multiHandles ? (
                        <>
                            <TableHead>LH</TableHead>
                            <TableHead>RH</TableHead>
                        </>
                    ) : (
                        <TableHead>Qty</TableHead>
                    )}
                    <TableHead>Rate</TableHead>
                    <TableHead>Total</TableHead>
                </TableHeader>
                {moulding.multiDykeComponents.map((com, cid) => (
                    <TableBody key={com.id}>
                        {com.meta.doorType == "Services" && (
                            <TableRow>
                                <TableCell>{cid + 1}</TableCell>
                                <TableCell>{com.description}</TableCell>

                                <TableCell>
                                    <TableCol.Secondary>
                                        {com.qty}
                                    </TableCol.Secondary>
                                </TableCell>
                                <TableCell>
                                    <TableCol.Secondary>
                                        <Money value={com.rate} />
                                    </TableCol.Secondary>
                                </TableCell>
                                <TableCell>
                                    <TableCol.Secondary>
                                        <Money value={com.total} />
                                    </TableCol.Secondary>
                                </TableCell>
                            </TableRow>
                        )}
                        {com.meta.doorType == "Moulding" && (
                            <TableRow>
                                <TableCell>{cid + 1}</TableCell>
                                <TableCell>
                                    {com.housePackageTool?.molding?.title}
                                </TableCell>
                                <TableCell>
                                    <TableCol.Secondary>
                                        {com.qty}
                                    </TableCol.Secondary>
                                </TableCell>
                                <TableCell>
                                    <TableCol.Secondary>
                                        <Money value={com.rate} />
                                    </TableCol.Secondary>
                                </TableCell>
                                <TableCell>
                                    <TableCol.Secondary>
                                        <Money value={com.total} />
                                    </TableCol.Secondary>
                                </TableCell>
                            </TableRow>
                        )}
                        {com.housePackageTool?.doors.map((door) => (
                            <TableRow id={`dyke-${cid}`} key={door.id}>
                                <TableCell>{cid + 1}</TableCell>

                                <TableCell>
                                    {com.housePackageTool?.door?.title}
                                    <p>{inToFt(door?.dimension)}</p>
                                </TableCell>
                                {moulding.isType.hasSwing && (
                                    <TableCell>
                                        <TableCol.Secondary>
                                            {door.swing}
                                        </TableCol.Secondary>
                                    </TableCell>
                                )}
                                {moulding.isType.multiHandles ? (
                                    <>
                                        <TableHead>{door.lhQty}</TableHead>
                                        <TableHead>{door.rhQty}</TableHead>
                                    </>
                                ) : (
                                    <TableCell>
                                        {door.lhQty || door.totalQty}
                                    </TableCell>
                                )}

                                <TableCell>
                                    <Money value={door.unitPrice} />
                                </TableCell>
                                <TableCell>
                                    <Money value={door.lineTotal} />
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                ))}
            </Table>
        </div>
    ));
}
