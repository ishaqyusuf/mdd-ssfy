import { useIsMobile } from "@gnd/ui/hooks/use-mobile";
import { Menu } from "@gnd/ui/custom/menu";
import { RouterOutputs } from "@api/trpc/routers/_app";

import { Button } from "@gnd/ui/button";
import { Icons } from "@gnd/ui/icons";
import { ColumnDef } from "@tanstack/react-table";
import { cn } from "@gnd/ui/cn";
import { useCustomerServiceParams } from "@/hooks/use-customer-service-params";
import { cells } from "@gnd/ui/data-table/cells";
import { formatDate } from "@gnd/utils/dayjs";
import { Item } from "@gnd/ui/composite";
import TextWithTooltip from "@gnd/ui/custom/text-with-tooltip";

export type Item =
    RouterOutputs["customerService"]["getCustomerServices"]["data"][number];
interface ItemProps {
    item: Item;
}
type Column = ColumnDef<Item>;

export const columns: Column[] = [
    cells.selectColumn,
    {
        header: "Appointment",
        accessorKey: "Appointment",
        meta: {
            // preventDefault: true,
            className: "w-[150px]",
        },
        cell: ({ row: { original: item } }) => (
            <>
                <Item.Title>{formatDate(item.scheduleDate)}</Item.Title>
                <Item.Description>{item.scheduleTime}</Item.Description>
            </>
        ),
    },
    {
        header: "Customer",
        accessorKey: "Customer",
        meta: {
            // preventDefault: true,
            className: "w-[150px]",
        },
        cell: ({ row: { original: item } }) => (
            <>
                <Item.Title>{item.homeOwner}</Item.Title>
                <Item.Description>{item.homePhone}</Item.Description>
            </>
        ),
    },
    {
        header: "Description",
        accessorKey: "Description",
        meta: {
            // preventDefault: true,
            className: "",
        },
        cell: ({ row: { original: item } }) => (
            <>
                <Item.Title>{item.projectName}</Item.Title>

                <TextWithTooltip
                    className="max-w-[200px] text-secondary-foreground"
                    text={item.description}
                />
            </>
        ),
    },
    {
        header: "Assigned To",
        accessorKey: "Assigned To",
        meta: {
            // preventDefault: true,
            className: "w-[150px]",
        },
        cell: ({ row: { original: item } }) => (
            <>
                <Item.Title>{item.tech?.name}</Item.Title>
            </>
        ),
    },
    {
        header: "",
        accessorKey: "action",
        meta: {
            actionCell: true,
            preventDefault: true,
            className: "dt-action-cell",
        },
        cell: ({ row: { original: item } }) => (
            <>
                <Actions item={item} />
            </>
        ),
    },
];

function Actions({ item }: ItemProps) {
    const isMobile = useIsMobile();
    return (
        <div className="relative flex justify-end z-10">
            <Menu
                triggerSize={isMobile ? "default" : "xs"}
                Trigger={
                    <Button
                        className={cn(isMobile || "size-4 p-0")}
                        variant="ghost"
                    >
                        <Icons.MoreHoriz className="" />
                    </Button>
                }
            >
                <Menu.Item SubMenu={<></>}>Mark as</Menu.Item>
            </Menu>
        </div>
    );
}
export const mobileColumn: ColumnDef<Item>[] = [
    {
        header: "",
        accessorKey: "row",
        meta: {
            className: "flex-1 p-0",
            // preventDefault: true,
        },
        cell: ({ row: { original: item } }) => {
            return <ItemCard item={item} />;
        },
    },
];
function ItemCard({ item }: ItemProps) {
    // design a mobile version of the columns here
    const { setParams } = useCustomerServiceParams();
    return <></>;
}

