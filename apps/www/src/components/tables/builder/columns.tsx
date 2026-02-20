import { useIsMobile } from "@gnd/ui/hooks/use-mobile";
import { Menu } from "@gnd/ui/custom/menu";
import { RouterOutputs } from "@api/trpc/routers/_app";
import { cells } from "@gnd/ui/custom/data-table/cells";
import { Button } from "@gnd/ui/button";
import { Icons } from "@gnd/ui/icons";
import { ColumnDef } from "@tanstack/react-table";
import { cn } from "@gnd/ui/cn";
import { useBuilderParams } from "@/hooks/use-builder-params";
import { Item } from "@gnd/ui/namespace";

export type Item = RouterOutputs["community"]["getBuilders"]["data"][number];
interface ItemProps {
    item: Item;
}
type Column = ColumnDef<Item>;
const column1: Column = {
    header: "Builder Name",
    accessorKey: "builderName",
    meta: {},
    cell: ({ row: { original: item } }) => (
        <>
            <Item.Title>{item.name}</Item.Title>
        </>
    ),
};
const totalProjects: Column = {
    header: "Total Projects",
    accessorKey: "totalProjects",
    meta: {
        className: "",
    },
    cell: ({ row: { original: item } }) => (
        <>
            {/* <Item.Title>{}</Item.Title> */}
            <Item.Description>{item?._count?.projects || 0}</Item.Description>
        </>
    ),
};
const builderTasks: Column = {
    header: "Builder Tasks",
    accessorKey: "builderTasks",
    meta: {
        className: "",
    },
    cell: ({ row: { original: item } }) => (
        <>
            {/* <Item.Title>{}</Item.Title> */}
            <Item.Description>{item._count.tasks}</Item.Description>
        </>
    ),
};
const homes: Column = {
    header: "homes",
    accessorKey: "homes",
    meta: {
        className: "",
    },
    cell: ({ row: { original: item } }) => (
        <>
            <Item.Description>{item._count.homes}</Item.Description>
        </>
    ),
};
export const columns: Column[] = [
    // cells.selectColumn,
    column1,
    totalProjects,
    builderTasks,
    homes,
    {
        header: "",
        accessorKey: "action",
        meta: {
            actionCell: true,
            preventDefault: true,
            className: "w-[100px] dt-action-cell",
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
    const { setParams } = useBuilderParams();
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
            {/* <Edit */}
            <Button
                size="sm"
                variant="outline"
                onClick={(e) => {
                    setParams({
                        openBuilderId: item.id,
                    });
                }}
            >
                <Icons.Edit className="h-4 w-4" />
            </Button>
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
    const { setParams } = useBuilderParams();
    return <></>;
}

