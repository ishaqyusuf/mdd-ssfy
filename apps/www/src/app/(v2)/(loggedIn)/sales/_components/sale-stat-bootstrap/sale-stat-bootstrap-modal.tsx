import { useEffect, useState } from "react";
import { TableCell } from "@/app/_components/data-table/table-cells";
import {
    Menu,
    MenuItem,
} from "@/components/_v1/data-table/data-table-row-actions";
import Button from "@/components/common/button";
import Modal from "@/components/common/modal";
import { useModal } from "@/components/common/modal/provider";
import { updateSalesStat } from "@/data-access/sales.stats";
import useEffectLoader from "@/lib/use-effect-loader";
import { toast } from "sonner";

import { Checkbox } from "@gnd/ui/checkbox";
import { Label } from "@gnd/ui/label";
import { Table, TableBody, TableRow } from "@gnd/ui/table";

import { loadSales } from "./action";

export function SaleSattBtn() {
    const modal = useModal();
    return (
        <>
            <Button onClick={() => modal.openSheet(<SaleStatBootstrapModal />)}>
                Bootstrap
            </Button>{" "}
        </>
    );
}
function SaleStatBootstrapModal({}) {
    const data = useEffectLoader(loadSales);
    const [toggle, setToggle] = useState(false);
    const [cont, setCont] = useState(false);
    const [contVal, setContVal] = useState(null);
    useEffect(() => {
        if (cont) {
            _cont(contVal);
        }
    }, [data.refreshToken]);
    async function _cont(_) {
        setContVal(_);
        const vals = data?.data
            ?.filter((s, i) => s.stat.length < 3)
            .filter((ss, i) => i < _);
        const promise = Promise.all(
            vals.map(async (d, i) => {
                await updateSalesStat(d.id);
            }),
        );
        toast.promise(promise, {
            loading: "Loading...",
            success: (_data) => {
                if (vals.length) data.refresh();
                return `${vals.length} items generated`;
            },
            error: "Error",
        });
    }
    return (
        <Modal.Content>
            <Modal.Header
                title={
                    <>
                        <span>
                            With Stat:{" "}
                            {data.data?.filter((s) => s.stat?.length).length}
                        </span>
                        <span className="mx-2">
                            Without Stat:{" "}
                            {data.data?.filter((s) => !s.stat?.length).length}
                        </span>
                    </>
                }
                subtitle={
                    <div className="flex">
                        <Checkbox
                            defaultValue={toggle as any}
                            onCheckedChange={(e) => setToggle(e as any)}
                        ></Checkbox>
                        <div>
                            <Checkbox
                                defaultValue={cont as any}
                                onCheckedChange={(e) => setCont(e as any)}
                            ></Checkbox>
                            <Label>Contrinues</Label>
                        </div>
                        <Menu>
                            {[10, 20, 30, 40, 50].map((s) => (
                                <MenuItem onClick={() => _cont(s)} key={s}>
                                    {s}
                                </MenuItem>
                            ))}
                        </Menu>
                    </div>
                }
            />
            <Table>
                <TableBody>
                    {data.data
                        ?.filter((s) => (toggle ? s.stat.length < 3 : true))
                        ?.map((order) => (
                            <TableRow key={order.id}>
                                <TableCell>
                                    <TableCell.Primary>
                                        {order.orderId}
                                    </TableCell.Primary>
                                </TableCell>
                                <TableCell>
                                    <TableCell.Secondary>
                                        {order.stat.length}
                                    </TableCell.Secondary>
                                </TableCell>
                                <TableCell>
                                    <Button
                                        action={async () => {
                                            await updateSalesStat(order.id);
                                            data.refresh();
                                            toast.message("Generated");
                                        }}
                                    >
                                        Generate
                                    </Button>
                                </TableCell>
                            </TableRow>
                        ))}
                </TableBody>
            </Table>
        </Modal.Content>
    );
}
