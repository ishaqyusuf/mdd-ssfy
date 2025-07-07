import { TableCell } from "@/app/_components/data-table/table-cells";
import { deleteOrderAction } from "@/app/(v1)/(loggedIn)/sales/_actions/sales";
import { updateDeliveryModeDac } from "@/app/(v2)/(loggedIn)/sales/_data-access/update-delivery-mode.dac";
import salesData from "@/app/(v2)/(loggedIn)/sales/sales-data";
import {
    DeleteRowAction,
    Menu,
    MenuItem,
} from "@/components/_v1/data-table/data-table-row-actions";
import StatusBadge from "@/components/_v1/status-badge";
import FStatusBadge from "@/components/(clean-code)/fikr-ui/f-status-badge";
import { GetSales } from "@/data-access/sales";
import { getBadgeColor } from "@/lib/status-badge";
import { cn, sum } from "@/lib/utils";
import { toast } from "sonner";

import { Badge } from "@gnd/ui/badge";
import { Button } from "@gnd/ui/button";
import {
    DropdownMenuLabel,
    DropdownMenuSeparator,
} from "@gnd/ui/dropdown-menu";

import { useAssignment } from "../../../sales-v2/productions/_components/_modals/assignment-modal/use-assignment";
import { useSalesStatus } from "../../hooks/sales-hooks";
import { MenuOption, useSalesMenu } from "../../utils/use-sales-menu";

export interface SalesCellProps {
    item: GetSales["data"][number];
}
function OrderDispatch({ item, href }: SalesCellProps & { href? }) {
    return (
        <TableCell href={href} className="">
            <TableCell.Medium
                className={cn(
                    item.isDyke ? "font-bold" : "",
                    "whitespace-nowrap",
                )}
            >
                {item.orderId}
            </TableCell.Medium>
            <TableCell.Secondary className="inline-flex items-center space-x-2">
                <TableCell.Date>{item.createdAt}</TableCell.Date>
            </TableCell.Secondary>
        </TableCell>
    );
}
function Order({ item }: SalesCellProps) {
    const href = item.isDyke
        ? `/sales-v2/overview/${item.type}/${item.slug}`
        : `/sales/order/${item.slug}`;
    return <OrderDispatch item={item} href={href} />;
}

function Customer({ item, noLink }: SalesCellProps & { noLink?: boolean }) {
    let address = item?.shippingAddress || item?.billingAddress;
    if (!address && !item.customer) return <TableCell></TableCell>;
    const link = noLink ? undefined : "/sales/customer/" + item.customer?.id;
    return (
        <TableCell href={link}>
            <TableCell.Medium className="uppercase">
                {item.customer?.businessName ||
                    item?.customer?.name ||
                    address?.name}
            </TableCell.Medium>
            <TableCell.Secondary>
                {address?.phoneNo || item?.customer?.phoneNo}
            </TableCell.Secondary>
        </TableCell>
    );
}
function Address({ item }: SalesCellProps) {
    return (
        <TableCell>
            <TableCell.Secondary className="line-clamp-2">
                {item?.shippingAddress?.address1}
            </TableCell.Secondary>
        </TableCell>
    );
}
function SalesRep({ item }: SalesCellProps) {
    return (
        <TableCell>
            <TableCell.Secondary
                className={cn(
                    !item?.salesRep?.name && "text-red-500",
                    "w-16 truncate",
                )}
            >
                {item?.salesRep?.name || item?.customer?.businessName}
            </TableCell.Secondary>
        </TableCell>
    );
}
function Invoice({ item }: SalesCellProps) {
    if (
        (!item.amountDue || item.amountDue == item.grandTotal) &&
        item.type != "quote"
    )
        return (
            <TableCell>
                <TableCell.Money
                    className={
                        !item.amountDue
                            ? "font-semibold text-green-500"
                            : "text-red-500"
                    }
                >
                    {item.grandTotal}
                </TableCell.Money>
            </TableCell>
        );
    return (
        <TableCell>
            <TableCell.Primary>
                <TableCell.Money>{item.grandTotal}</TableCell.Money>
            </TableCell.Primary>
            {item.type != "quote" && (
                <TableCell.Secondary className="text-red-500">
                    ( <TableCell.Money>{item.amountDue}</TableCell.Money>)
                </TableCell.Secondary>
            )}
        </TableCell>
    );
}
function PaymentDueDate({ item }: SalesCellProps) {
    return (
        <TableCell>
            <TableCell.Date>{item.paymentDueDate}</TableCell.Date>
        </TableCell>
    );
}
function Dispatch({ item }: SalesCellProps) {
    const date =
        item.pickup?.pickupAt || item.pickup?.createdAt || item.deliveredAt;
    function Content() {
        return (
            <>
                <span className="capitalize">
                    <StatusBadge status={item.deliveryOption || "not set"} sm />
                    {date && <TableCell.Date>{date}</TableCell.Date>}
                </span>
            </>
        );
    }
    async function updateDeliveryMode(delivery) {
        if (delivery != item.deliveryOption) {
            await updateDeliveryModeDac(
                item.id,
                delivery,
                item.type == "order" ? "orders" : "quotes",
            );

            toast.success("Updated");
        }
    }
    if (date) return <Content />;

    return (
        <TableCell>
            <Menu
                Trigger={
                    <Button variant="outline" size="sm">
                        <Content />
                    </Button>
                }
            >
                {salesData.delivery.map((o) => (
                    <MenuItem
                        onClick={() => updateDeliveryMode(o.value)}
                        key={o.value}
                    >
                        {o.text}
                    </MenuItem>
                ))}
            </Menu>{" "}
        </TableCell>
    );
}
function Status({ item, delivery }: SalesCellProps & { delivery? }) {
    let status: any = item?.prodStatus;
    if (["In Transit", "Return", "Delivered"].includes(item?.status as any))
        status = item?.status;
    if (!status) status = delivery ? "-" : item?.prodId ? "Prod Queued" : "";
    if (status == "Completed" && delivery) status = "Ready";
    const color = getBadgeColor(status || "");

    // return (
    //     <div className="min-w-16">
    //         <Badge
    //             variant={"secondary"}
    //             className={`h-5 px-1 whitespace-nowrap text-xs text-slate-100 ${color}`}
    //         >
    //             {/* {order?.prodStatus || "-"} */}
    //             {status || "no status"}
    //         </Badge>

    //         {delivery && order?.deliveredAt && (
    //             <DateCellContent>{order.deliveredAt}</DateCellContent>
    //         )}
    //     </div>
    // );
    return (
        <TableCell>
            <Badge
                variant={"secondary"}
                className={`h-5 whitespace-nowrap px-1 text-xs text-slate-100 ${color}`}
            >
                {/* {order?.prodStatus || "-"} */}
                {status || "no status"}
            </Badge>

            {delivery && item?.deliveredAt && (
                <TableCell.Date>{item.deliveredAt}</TableCell.Date>
            )}
        </TableCell>
    );
}
function EvaluationSalesAction({ item }: SalesCellProps) {
    const ctx = useSalesMenu(item as any);

    return (
        <>
            <Menu>
                <ctx.MenuList withDelete menuKey="evalMenu" />
            </Menu>
        </>
    );
}
function SalesAction({ item }: SalesCellProps) {
    const ctx = useSalesMenu(item as any);

    return (
        <>
            <Menu>
                {/* <MenuItem icon="menu"></MenuItem> */}
                {ctx.options?.map((option, oi) => (
                    <ctx.Render option={option} key={oi} />
                ))}
                <DeleteRowAction menu row={item} action={deleteOrderAction} />
            </Menu>
        </>
    );
}
function SalesStatus({ item }: SalesCellProps) {
    let delivery = null;
    let status: any = item?.prodStatus || item?.status;
    if (["In Transit", "Return", "Delivered"].includes(item?.status as any))
        status = item?.status;
    if (!status)
        status = delivery ? "-" : item?.prodId ? "Prod Queued" : "no status";
    if (status == "Completed" && delivery) status = "Ready";
    const color = getBadgeColor(status || "");
    return (
        <TableCell>
            <FStatusBadge status={status} />
            {/* <Badge
                variant={"secondary"}
                className={`h-5 px-1 whitespace-nowrap text-xs text-slate-100 ${color}`}
            > 
                {status || "no status"}
            </Badge> */}

            {delivery && item?.deliveredAt && (
                <TableCell.Date>{item.deliveredAt}</TableCell.Date>
            )}
        </TableCell>
        //   <div className="min-w-16">

        //   </div>
    );
}
function ProductionStatus({ item }: SalesCellProps) {
    const submitted = sum(
        item.assignments.map((a) =>
            sum(a.submissions.map((s) => sum([s.lhQty, s.rhQty]))),
        ),
    );
    // item.assignments[0].
    const totalDoors = item._meta.totalDoors;
    // console.log(item.productionStatus?.status);
    if (submitted == totalDoors)
        return (
            <TableCell>
                <TableCell.Status status="Completed" />
            </TableCell>
        );
    return (
        <TableCell>
            <TableCell.Status
                score={submitted}
                total={totalDoors}
                // status={item.productionStatus?.status}
            />
        </TableCell>
    );
}
function DeliveryAction({ item }: SalesCellProps) {
    const assignment = useAssignment({ type: "prod" });
    return (
        <>
            <Button
                onClick={() => assignment.open(item.id)}
                variant={"outline"}
            >
                View
            </Button>
        </>
    );
}
function DeliveryStatus({ item }: SalesCellProps) {
    const status = useSalesStatus(item);

    return <TableCell></TableCell>;
}
export let SalesCells = {
    SalesRep,
    DeliveryStatus,
    SalesStatus,
    Status,
    Order,
    OrderDispatch,
    Customer,
    ProductionStatus,
    // Flag: SalesFlag,
    Address,
    PaymentDueDate,
    Invoice,
    Dispatch,
    SalesAction,
    EvaluationSalesAction,
    DeliveryAction,
};
