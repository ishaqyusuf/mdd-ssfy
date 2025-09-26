import { useIsMobile } from "@gnd/ui/hooks/use-mobile";
import { Menu } from "@gnd/ui/custom/menu";
import { RouterOutputs } from "@api/trpc/routers/_app";

import { Button } from "@gnd/ui/button";
import { Icons } from "@gnd/ui/icons";
import { ColumnDef } from "@tanstack/react-table";
import { cn } from "@gnd/ui/cn";
import { useCommunityProjectParams } from "@/hooks/use-community-project-params";
import { ConfirmBtn } from "@gnd/ui/confirm-button";
import { TCell } from "@/components/(clean-code)/data-table/table-cells";
import { formatDate } from "@gnd/utils/dayjs";

export type Item =
    RouterOutputs["community"]["getCommunityProjects"]["data"][number];
interface ItemProps {
    item: Item;
}
type Column = ColumnDef<Item>;
const refDate: Column = {
    header: "Ref/Date",
    accessorKey: "ref_date",
    meta: {
        className: "w-32",
    },
    cell: ({ row: { original: item } }) => (
        <>
            <TCell.Primary>{item.refNo}</TCell.Primary>
            <TCell.Secondary>{formatDate(item.createdAt)}</TCell.Secondary>
        </>
    ),
};
const project: Column = {
    header: "Project",
    accessorKey: "project",
    meta: {},
    cell: ({ row: { original: item } }) => (
        <>
            <TCell.Primary>{item.title}</TCell.Primary>
            <TCell.Secondary>{item.builder?.name}</TCell.Secondary>
        </>
    ),
};
const supervisor: Column = {
    header: "Supervisor",
    accessorKey: "supervisor",
    meta: {
        className: "sm:w-56",
    },
    cell: ({ row: { original: item } }) => (
        <>
            <TCell.Primary>{item.meta?.supervisor?.name}</TCell.Primary>
        </>
    ),
};
const units: Column = {
    header: "Units",
    accessorKey: "units",
    meta: {
        className: "w-16",
    },
    cell: ({ row: { original: item } }) => (
        <TCell.Primary className="text-center">
            {item._count.homes}
        </TCell.Primary>
    ),
};
const addons: Column = {
    header: "Addons",
    accessorKey: "addons",
    meta: {
        className: "",
    },
    cell: ({ row: { original: item } }) => (
        <>
            <Button
                hoverVariant="outline"
                variant={item.meta?.addon ? "secondary" : "default"}
            >
                Add
            </Button>
        </>
    ),
};
export const columns: Column[] = [
    refDate,
    project,
    supervisor,
    units,
    addons,
    {
        header: "",
        accessorKey: "action",
        meta: {
            actionCell: true,
            preventDefault: true,
            className: "w-[100px]",
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
            {/* <Menu
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
            </Menu> */}
            <ConfirmBtn trash variant="outline" className="px-2" size="sm" />
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
    const { setParams } = useCommunityProjectParams();
    return <></>;
}

