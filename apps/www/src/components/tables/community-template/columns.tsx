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
import { useCommunityInstallCostParams } from "@/hooks/use-community-install-cost-params";
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@gnd/ui/tooltip";
import { formatCurrency } from "@/lib/utils";

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
        className: "w-[50px]!",
        preventDefault: true,
    },
    cell: ({ row: { original: item } }) => (
        <>
            <Link
                href={`/community/community-template/${item?.slug?.toLowerCase()}/v1`}
            >
                {/* <Link href={`/community/model-template/${item?.slug}`}> */}
                <TCell.Primary>{item.modelName}</TCell.Primary>
            </Link>
        </>
    ),
};
const project: Column = {
    header: "Project",
    accessorKey: "project",
    meta: {
        // className: "w-[100px]",
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
        className: "w-[100px]",
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
    header: "Install Cost",
    accessorKey: "installCost",
    meta: {
        className: "w-[80px]",
        preventDefault: true,
    },
    cell: ({ row: { original: item } }) => {
        const { setParams } = useCommunityInstallCostParams();
        const summary = item.installCostV2Summary;
        const completionRatio = Math.max(
            0,
            Math.min(1, summary?.completionRatio ?? 0),
        );
        const backgroundOpacity = +(0.18 + completionRatio * 0.72).toFixed(2);
        const totalEstimate = summary?.totalEstimate ?? 0;
        const configuredTasks = summary?.configuredBuilderTasks ?? 0;
        const totalTasks = summary?.totalBuilderTasks ?? 0;
        const tooltipTasks = summary?.tasks ?? [];

        return (
            <TooltipProvider delayDuration={100}>
                <Tooltip>
                    <TooltipTrigger asChild>
                        <Button
                            onClick={(e) => {
                                setParams({
                                    editCommunityModelInstallCostId: item.id,
                                    mode: "v2",
                                });
                            }}
                            size="sm"
                            variant="outline"
                            className={cn(
                                "min-w-[112px] justify-center border-emerald-700/20 font-semibold shadow-none transition-colors",
                                completionRatio > 0.5
                                    ? "text-white hover:text-white"
                                    : "text-emerald-950 hover:text-emerald-950",
                            )}
                            style={{
                                backgroundColor: `rgba(34, 197, 94, ${backgroundOpacity})`,
                                borderColor: `rgba(21, 128, 61, ${Math.max(
                                    0.2,
                                    completionRatio,
                                )})`,
                            }}
                        >
                            {formatCurrency.format(totalEstimate)}
                        </Button>
                    </TooltipTrigger>
                    <TooltipContent className="max-w-72 space-y-2">
                        <div className="space-y-1">
                            <p className="text-sm font-semibold">
                                {configuredTasks} of {totalTasks} builder tasks
                                configured
                            </p>
                            <p className="text-xs text-muted-foreground">
                                Total qty: {summary?.totalQty ?? 0}
                            </p>
                            <p className="text-xs text-muted-foreground">
                                Total estimate:{" "}
                                {formatCurrency.format(totalEstimate)}
                            </p>
                        </div>
                        <div className="space-y-1">
                            {tooltipTasks.length ? (
                                tooltipTasks.map((task) => (
                                    <div
                                        key={task.taskId}
                                        className="flex items-center justify-between gap-3 text-xs"
                                    >
                                        <span className="truncate">
                                            {task.taskName}
                                        </span>
                                        <span className="shrink-0 text-muted-foreground">
                                            {task.totalQty} ·{" "}
                                            {formatCurrency.format(
                                                task.totalEstimate,
                                            )}
                                        </span>
                                    </div>
                                ))
                            ) : (
                                <p className="text-xs text-muted-foreground">
                                    No builder tasks configured yet.
                                </p>
                            )}
                        </div>
                    </TooltipContent>
                </Tooltip>
            </TooltipProvider>
        );
    },
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
                            "p/model-template",
                            {
                                preview: true,
                                // slugs: [item.id].join(","),
                                // slugs: "",
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
    const { setParams: setModelCostParams } = useCommunityModelCostParams();
    const { setParams: setInstallCostParams } = useCommunityInstallCostParams();
    const cost = item.costs?.find((c) => c.current);
    const modelCostMoney = cost?.meta?.grandTotal;
    const installSummary = item.installCostV2Summary;
    const totalEstimate = installSummary?.totalEstimate ?? 0;
    const configuredTasks = installSummary?.configuredBuilderTasks ?? 0;
    const totalTasks = installSummary?.totalBuilderTasks ?? 0;

    return (
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex items-start gap-3">
                <Link
                    href={`/community/community-template/${item?.slug?.toLowerCase()}/v1`}
                    className="min-w-0 flex-1 text-left"
                >
                    <p className="text-base font-semibold text-slate-900">
                        {item.modelName}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                        {formatDate(item.createdAt)}
                    </p>
                </Link>
                <div className="shrink-0">
                    <Actions item={item} />
                </div>
            </div>

            <div className="mt-4 rounded-2xl bg-slate-50 px-3 py-3">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                    Project
                </p>
                <p className="mt-1 text-sm font-semibold text-slate-900">
                    {item.project?.title}
                </p>
                <p className="text-xs text-muted-foreground">
                    {item.project?.builder?.name}
                </p>
            </div>

            <div className="mt-3 grid grid-cols-3 gap-2">
                <div className="rounded-2xl border border-slate-200 px-3 py-3 text-center">
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                        Units
                    </p>
                    <p className="mt-2 text-lg font-semibold text-slate-900">
                        {item._count.homes}
                    </p>
                </div>
                <button
                    type="button"
                    className="rounded-2xl border border-slate-200 px-3 py-3 text-left hover:bg-slate-50"
                    onClick={() => {
                        setModelCostParams({
                            editModelCostTemplateId: item.id,
                            editModelCostId:
                                item?.pivot?.modelCosts?.[0]?.id || -1,
                        });
                    }}
                >
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                        Model Cost
                    </p>
                    {!cost ? (
                        <Badge className="mt-2 bg-slate-200 text-slate-700 hover:bg-slate-200">
                            Set Cost
                        </Badge>
                    ) : (
                        <p className="mt-2 text-sm font-semibold text-slate-900">
                            <Money value={modelCostMoney} />
                        </p>
                    )}
                </button>
                <button
                    type="button"
                    className="rounded-2xl border border-slate-200 px-3 py-3 text-left hover:bg-slate-50"
                    onClick={() => {
                        setInstallCostParams({
                            editCommunityModelInstallCostId: item.id,
                            mode: "v2",
                        });
                    }}
                >
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                        Install Cost
                    </p>
                    <p className="mt-2 text-sm font-semibold text-emerald-700">
                        {formatCurrency.format(totalEstimate)}
                    </p>
                    <p className="mt-1 text-[10px] text-muted-foreground">
                        {configuredTasks}/{totalTasks} tasks
                    </p>
                </button>
            </div>
        </div>
    );
}
