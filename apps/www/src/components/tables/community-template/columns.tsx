import { useIsMobile } from "@gnd/ui/hooks/use-mobile";
import { Menu } from "@gnd/ui/custom/menu";
import { RouterOutputs } from "@api/trpc/routers/_app";

import { Button } from "@gnd/ui/button";
import { Icons } from "@gnd/ui/icons";
import { ColumnDef } from "@tanstack/react-table";
import { cn } from "@gnd/ui/cn";
import { useCommunityTemplateParams } from "@/hooks/use-community-template-params";
import { formatDate } from "@gnd/utils/dayjs";
import { TCell } from "@/components/(clean-code)/data-table/table-cells";
import { useCommunityModelCostParams } from "@/hooks/use-community-model-cost-params";
import { Badge } from "@gnd/ui/badge";
import Money from "@/components/_v1/money";
import Link from "next/link";
import { openLink } from "@/lib/open-link";

export type Item =
    RouterOutputs["community"]["getCommunityTemplates"]["data"][number];
interface ItemProps {
    item: Item;
}
type Column = ColumnDef<Item>;
const column1: Column = {
    header: "Date",
    accessorKey: "header",
    meta: {
        className: "w-8",
    },
    cell: ({ row: { original: item } }) => <>{formatDate(item.createdAt)}</>,
};
const model: Column = {
    header: "model",
    accessorKey: "model",
    meta: {
        className: "w-[50px]",
        preventDefault: true,
    },
    cell: ({ row: { original: item } }) => (
        <>
            <Link href={`/community/model-template/${item?.slug}`}>
                <TCell.Primary>{item.modelName}</TCell.Primary>
            </Link>
        </>
    ),
};
const project: Column = {
    header: "Project",
    accessorKey: "project",
    meta: {
        className: "w-[100px]",
    },
    cell: ({ row: { original: item } }) => (
        <>
            <TCell.Primary>{item.project?.title}</TCell.Primary>
            <TCell.Secondary>{item.project?.builder?.name}</TCell.Secondary>
        </>
    ),
};
const units: Column = {
    header: "units",
    accessorKey: "units",
    meta: {
        className: "w-[50px] text-center",
    },
    cell: ({ row: { original: item } }) => (
        <>
            <TCell.Primary>{item._count.homes}</TCell.Primary>
        </>
    ),
};
const modelCost: Column = {
    header: "Model Cost",
    accessorKey: "modelCost",
    meta: {
        className: "w-[150px]",
        preventDefault: true,
    },
    cell: ({ row: { original: item } }) => {
        const { setParams } = useCommunityModelCostParams();
        const costs = item.costs;
        const cost = costs?.find((c) => c.current);
        const money = cost?.meta?.grandTotal;
        return (
            <div
                onClick={(e) => {
                    setParams({
                        editModelCostTemplateId: item.id,
                        editModelCostId: item?.pivot?.modelCosts?.[0]?.id || -1,
                    });
                }}
            >
                <>
                    <TCell.Primary>
                        {!cost ? (
                            <Badge className="bg-slate-200 text-slate-700 hover:bg-slate-200">
                                Set Cost
                            </Badge>
                        ) : (
                            <Money value={money} />
                        )}
                    </TCell.Primary>
                    {costs?.length ? (
                        <TCell.Secondary>
                            {costs?.length} cost history
                        </TCell.Secondary>
                    ) : (
                        <></>
                    )}
                </>
            </div>
        );
    },
};
const installCost: Column = {
    header: "installCost",
    accessorKey: "installCost",
    meta: {
        className: "w-[150px]",
    },
    cell: ({ row: { original: item } }) => <></>,
};
export const columns: Column[] = [
    column1,
    project,
    model,
    units,
    modelCost,
    installCost,
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
                    onClick={(e) => {
                        openLink(
                            "api/download/model-template",
                            {
                                preview: true,
                                // slugs: [item.id].join(","),
                                slugs: "",
                                templateSlug: item.slug,
                            },
                            true,
                        );
                    }}
                >
                    Preview
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
    const { setParams } = useCommunityTemplateParams();
    return <></>;
}

