import React, { useTransition } from "react";
import { _revalidate } from "@/app/(v1)/_actions/_revalidate";
import {
    Menu,
    MenuItem,
} from "@/components/_v1/data-table/data-table-row-actions";
import { SalesOrders } from "@/db";
import { IPriority, ISalesOrderMeta } from "@/types/sales";
import { toast } from "sonner";

import { updateOrderPriorityActon } from "../../../_actions/sales-priority";
import { Icons } from "@gnd/ui/custom/icons";

interface Props {
    item;
    editable?: boolean;
}
export default function SalesFlag({ item, editable = true }: Props) {
    const meta: ISalesOrderMeta = item.meta;
    const [color, setColor] = React.useState("gray");
    React.useEffect(() => {
        setColor(orderPriorityColorMap[order.meta?.priority || "Non"]);
    }, []);
    const order = { ...item } satisfies SalesOrders;

    const Flag = () => (
        <div className="w-[24px]">
            <Icons.flag className={`h-5 w-5 text-${color}-500`} />
        </div>
    );
    const [isPending, startTransition] = useTransition();
    async function updatePriority(priority) {
        startTransition(async () => {
            await updateOrderPriorityActon({
                orderId: order.orderId,
                priority,
            });
            toast.success("Priority updated!");
            _revalidate("orders");
        });
    }
    if (!editable) {
        return <Flag />;
    }
    return (
        <Menu Icon={Flag} variant={"secondary"}>
            {priorities.map((p, _) => (
                <MenuItem
                    key={_}
                    Icon={() => (
                        <Icons.flag
                            className={`mr-2 h-4 w-4 text-${p.color}-500`}
                        />
                    )}
                    onClick={() => updatePriority(p.title)}
                >
                    {p.title}
                </MenuItem>
            ))}
        </Menu>
    );
}
const orderPriorityColorMap: {
    [key in IPriority]: "red" | "yellow" | "orange" | "gray";
} = {
    Low: "yellow",
    High: "red",
    Medium: "orange",
    Non: "gray",
};
const priorities = ["Non", "Low", "Medium", "High"].map((title) => ({
    title,
    color: orderPriorityColorMap[title],
}));
