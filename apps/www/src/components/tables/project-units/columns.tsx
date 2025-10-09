import { useIsMobile } from "@gnd/ui/hooks/use-mobile";
import { Menu } from "@gnd/ui/custom/menu";
import { RouterOutputs } from "@api/trpc/routers/_app";

import { Button } from "@gnd/ui/button";
import { Icons } from "@gnd/ui/icons";
import { ColumnDef } from "@tanstack/react-table";
import { cn } from "@gnd/ui/cn";
import { useProjectUnitParams } from "@/hooks/use-project-units-params";

export type Item =
    RouterOutputs["community"]["getProjectUnits"]["data"][number];
interface ItemProps {
    item: Item;
}
type Column = ColumnDef<Item>;
const column1: Column = {
    header: "header",
    accessorKey: "header",
    meta: {},
    cell: ({ row: { original: item } }) => <></>,
};

export const columns: Column[] = [
    column1,
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
    const { setParams } = useProjectUnitParams();
    return <></>;
}

