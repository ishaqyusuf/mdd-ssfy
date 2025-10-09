import { useIsMobile } from "@gnd/ui/hooks/use-mobile";
import { Menu } from "@gnd/ui/custom/menu";
import { RouterOutputs } from "@api/trpc/routers/_app";

import { Button } from "@gnd/ui/button";
import { Icons } from "@gnd/ui/icons";
import { ColumnDef } from "@tanstack/react-table";
import { cn } from "@gnd/ui/cn";
import { useProjectUnitParams } from "@/hooks/use-project-units-params";
import { TCell } from "@/components/(clean-code)/data-table/table-cells";
import { formatDate } from "@gnd/utils/dayjs";
import { Progress } from "@gnd/ui/custom/progress";
import { Badge } from "@gnd/ui/badge";
import { colorsObject } from "@gnd/utils/colors";
import { openLink } from "@/lib/open-link";

export type Item =
    RouterOutputs["community"]["getProjectUnits"]["data"][number];
interface ItemProps {
    item: Item;
}
type Column = ColumnDef<Item>;
const column1: Column = {
    header: "date",
    accessorKey: "header",
    meta: {},
    cell: ({ row: { original: item } }) => (
        <>
            {/* <TCell.Primary>#{item.id}</TCell.Primary> */}
            <TCell.Primary>{formatDate(item.createdAt)}</TCell.Primary>
        </>
    ),
};

const projectColumn: Column = {
    header: "Project",
    accessorKey: "project",
    meta: {},
    cell: ({ row: { original: item } }) => (
        <>
            <TCell.Primary>{item.project?.title}</TCell.Primary>
            <TCell.Secondary>{item.project?.builder?.name}</TCell.Secondary>
        </>
    ),
};
const lotBlock: Column = {
    header: "Lot/Block",
    accessorKey: "lotBlock",
    meta: {},
    cell: ({ row: { original: item } }) => (
        <>
            <TCell.Primary>{item.lotBlock}</TCell.Primary>
            <TCell.Secondary>{item.modelName}</TCell.Secondary>
        </>
    ),
};
const production: Column = {
    header: "Production",
    accessorKey: "production",
    meta: {},
    cell: ({ row: { original: item } }) => (
        <div className="w-16">
            {/* {home.} */}
            <Progress>
                <Progress.Status>{item.production?.status}</Progress.Status>
            </Progress>
            <p>{item.production?.date}</p>
        </div>
    ),
};
const installation: Column = {
    header: "Installation",
    accessorKey: "installation",
    meta: {},
    cell: ({ row: { original: item } }) => (
        <>
            <div className="w-16">
                <Badge
                    variant={"secondary"}
                    style={{
                        backgroundColor:
                            item.jobCount > 0
                                ? colorsObject.limeGreen
                                : colorsObject.dimGray,
                    }}
                    className={cn(
                        `h-5 px-1 whitespace-nowrap  text-xs text-slate-100`,
                    )}
                >
                    {item.jobCount} submitted
                </Badge>
            </div>
        </>
    ),
};
export const columns: Column[] = [
    column1,
    projectColumn,
    lotBlock,
    production,
    installation,
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
                <Menu.Item
                    icon="print"
                    onClick={(e) => {
                        openLink(
                            "api/download/model-template",
                            {
                                preview: true,
                                slugs: [item.id].join(","),
                            },
                            true,
                        );
                    }}
                >
                    Print
                </Menu.Item>
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

