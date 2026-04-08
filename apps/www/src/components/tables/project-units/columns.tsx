import { updateCommunityVersion } from "@/actions/community/update-community-version";
import { useHomeModal } from "@/app-deps/(v1)/(loggedIn)/community/units/home-modal";
import { TCell } from "@/components/(clean-code)/data-table/table-cells";
import { AuthGuard } from "@/components/auth-guard";
import { _perm } from "@/components/sidebar/links";
import { _qc, _trpc } from "@/components/static-trpc";
import { useCommunityInstallCostParams } from "@/hooks/use-community-install-cost-params";
import { openLink } from "@/lib/open-link";
import type { RouterOutputs } from "@api/trpc/routers/_app";
import { Badge } from "@gnd/ui/badge";
import { Button } from "@gnd/ui/button";
import { cn } from "@gnd/ui/cn";
import { ConfirmBtn } from "@gnd/ui/confirm-button";
import { cells } from "@gnd/ui/custom/data-table/cells";
import { Menu } from "@gnd/ui/custom/menu";
import { Progress } from "@gnd/ui/custom/progress";
import { toast } from "@gnd/ui/use-toast";
import { colorsObject } from "@gnd/utils/colors";
import { formatDate } from "@gnd/utils/dayjs";
import { useMutation } from "@tanstack/react-query";
import type { ColumnDef } from "@tanstack/react-table";
import Link from "next/link";
import { useProjectUnitsPrintFlow } from "./print-flow";
export type Item =
    RouterOutputs["community"]["getProjectUnits"]["data"][number];
interface ItemProps {
    item: Item;
}
type Column = ColumnDef<Item>;
const column1: Column = {
    header: "Date",
    accessorKey: "header",
    meta: { sortable: true, className: "w-[110px]" },
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
    meta: { sortable: true },
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
    meta: {
        preventDefault: true,
        sortable: true,
        className: "w-[150px]",
    },
    cell: ({ row: { original: item } }) => {
        const path =
            item.template?.version === "v2"
                ? "model-template"
                : "community-template";
        return (
            <Link
                href={
                    item.template
                        ? `/community/${path}/${item.template.slug?.toLowerCase()}`
                        : ""
                }
                className="hover:underline relative"
            >
                <TCell.Primary>{item.lotBlock}</TCell.Primary>
                <TCell.Secondary>{item.modelName}</TCell.Secondary>
            </Link>
        );
    },
};
const production: Column = {
    header: "Production",
    accessorKey: "production",
    meta: {
        className: "w-[120px]",
    },
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
const installCost: Column = {
    header: "Install Cost",
    accessorKey: "installCost",
    meta: {
        className: "w-[140px]",
        preventDefault: true,
    },
    cell: ({ row: { original: item } }) => {
        const summary = item.installCostSummary;
        const { setParams } = useCommunityInstallCostParams();
        const statusClass =
            summary?.status === "ready"
                ? "bg-emerald-50 text-emerald-700"
                : summary?.status === "partial"
                  ? "bg-amber-50 text-amber-700"
                  : summary?.status === "not-required"
                    ? "bg-slate-50 text-slate-600"
                    : "bg-rose-50 text-rose-700";

        return (
            <button
                type="button"
                disabled={!item.template?.id}
                onClick={() => {
                    if (!item.template?.id) return;
                    setParams({
                        editCommunityModelInstallCostId: item.template.id,
                        mode: "v2",
                        view: "template-list",
                    });
                }}
                className={cn(
                    "inline-flex items-center gap-2 rounded-md px-2 py-1 text-left transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60",
                    statusClass,
                )}
            >
                <TCell.Primary className="font-semibold whitespace-nowrap">
                    {summary?.totalEstimate
                        ? `$${summary.totalEstimate.toFixed(0)}`
                        : summary?.status === "not-required"
                          ? "N/A"
                          : "$0"}
                </TCell.Primary>
                <TCell.Secondary className="whitespace-nowrap">
                    {summary?.totalTasks
                        ? `${summary.configuredTasks}/${summary.totalTasks} tasks`
                        : "No tasks"}
                </TCell.Secondary>
            </button>
        );
    },
};
const templateConfig: Column = {
    header: "Template",
    accessorKey: "templateConfig",
    meta: {
        className: "w-[180px]",
        preventDefault: true,
    },
    cell: ({ row: { original: item } }) => {
        const summary = item.templateSummary;
        const path =
            item.template?.version === "v2"
                ? "model-template"
                : "community-template";
        const href = item.template?.slug
            ? `/community/${path}/${item.template.slug.toLowerCase()}`
            : null;
        const statusClass =
            summary?.status === "ready"
                ? "bg-emerald-50 text-emerald-700"
                : "bg-rose-50 text-rose-700";

        return (
            <Link
                href={href || "#"}
                className={cn(
                    "inline-flex items-center gap-2 hover:opacity-90",
                    !href && "pointer-events-none opacity-60",
                )}
            >
                <Badge
                    variant={
                        item?.template?.version === "v1"
                            ? "secondary"
                            : "success"
                    }
                    className="px-1 rounded-full text-xs font-semibold font-mono"
                >
                    {item?.template?.version || "n/a"}
                </Badge>
                <div
                    className={cn(
                        "inline-flex items-center gap-2 rounded-md px-2 py-1",
                        statusClass,
                    )}
                >
                    <TCell.Primary className="font-semibold whitespace-nowrap">
                        {summary?.configuredCount || 0} configs
                    </TCell.Primary>
                </div>
            </Link>
        );
    },
};
const installation: Column = {
    header: "Installation",
    accessorKey: "installation",
    meta: {
        preventDefault: true,
        className: "w-[120px]",
    },
    cell: ({ row: { original: item } }) => (
        <>
            <Link
                href={
                    item.jobCount
                        ? `/hrm/contractors/jobs?unitId=${item.id}`
                        : "/"
                }
                className="w-16"
            >
                <Badge
                    variant={"secondary"}
                    style={{
                        backgroundColor:
                            item.jobCount > 0
                                ? colorsObject.limeGreen
                                : colorsObject.dimGray,
                    }}
                    className={cn(
                        "h-5 px-1 whitespace-nowrap  text-xs text-slate-100",
                    )}
                >
                    {item.jobCount} submitted
                </Badge>
            </Link>
        </>
    ),
};
const actionColumn: Column = {
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
};

export const columns: Column[] = [
    cells.selectColumn,
    column1,
    projectColumn,
    lotBlock,
    templateConfig,
    installCost,
    production,
    installation,
    actionColumn,
];

export const projectTabColumns: Column[] = [
    cells.selectColumn,
    column1,
    lotBlock,
    templateConfig,
    installCost,
    production,
    installation,
    actionColumn,
];

function Actions({ item }: ItemProps) {
    const ctx = useHomeModal();
    const { startPrint } = useProjectUnitsPrintFlow();
    const { mutateAsync } = useMutation(
        _trpc.community.deleteUnits.mutationOptions({
            onSuccess(data, variables, onMutateResult, context) {
                _qc.invalidateQueries({
                    queryKey:
                        _trpc.community.getProjectUnits.infiniteQueryKey(),
                });
            },
        }),
    );
    const preview = (version, homeIds = "") => {
        openLink(
            "p/model-template",
            {
                preview: true,
                homeIds,
                version,
                templateSlug: item.template.slug,
            },
            true,
        );
    };
    const updateVersion = async (version) => {
        await updateCommunityVersion(item?.template.id, version);
        toast({
            title: "Updated",
            variant: "success",
        });
        _qc.invalidateQueries({
            queryKey: _trpc.community.getProjectUnits.infiniteQueryKey(),
        });
    };
    return (
        <div className="relative items-center gap-2 flex justify-end z-10">
            <AuthGuard rules={[_perm.is("editProject")]}>
                <ConfirmBtn
                    onClick={async (e) => {
                        await mutateAsync({
                            unitIds: [item.id],
                        });
                    }}
                    trash
                    variant="outline"
                    className="px-2"
                    size="sm"
                />
            </AuthGuard>
            <Menu>
                <Menu.Item
                    Icon={"check"}
                    SubMenu={["v1", "v2"].map((v) => (
                        <Menu.Item onClick={(e) => updateVersion(v)} key={v}>
                            {v}
                        </Menu.Item>
                    ))}
                >
                    Update Version
                </Menu.Item>
                <Menu.Item
                    Icon={"check"}
                    SubMenu={["v1", "v2"].map((v) => (
                        <Menu.Item onClick={(e) => preview(v)} key={v}>
                            {v}
                        </Menu.Item>
                    ))}
                >
                    Preview
                </Menu.Item>
                <Menu.Item
                    icon="print"
                    onClick={() => {
                        startPrint([item]);
                    }}
                >
                    Print
                </Menu.Item>
                <Menu.Item
                    icon="edit"
                    onClick={(e) => {
                        // item.id
                        ctx.open(item);
                    }}
                >
                    Edit
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

function getProductionStatusClass(status?: string | null) {
    switch ((status || "").toLowerCase()) {
        case "completed":
            return "bg-emerald-100 text-emerald-700";
        case "started":
            return "bg-amber-100 text-amber-700";
        case "queued":
            return "bg-sky-100 text-sky-700";
        default:
            return "bg-slate-100 text-slate-600";
    }
}

function ItemCard({ item }: ItemProps) {
    const ctx = useHomeModal();
    const { startPrint } = useProjectUnitsPrintFlow();
    const path =
        item.template?.version === "v2"
            ? "model-template"
            : "community-template";

    return (
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex items-start gap-3">
                <button
                    type="button"
                    onClick={() => {
                        window.location.href = `/community/project-units/${item.slug}`;
                    }}
                    className="min-w-0 flex-1 text-left"
                >
                    <div className="flex flex-wrap items-center gap-2">
                        <p className="text-base font-semibold text-slate-900">
                            {item.lotBlock}
                        </p>
                        <Badge
                            variant={
                                item?.template?.version === "v1"
                                    ? "secondary"
                                    : "success"
                            }
                            className="rounded-full px-2 py-0 text-[10px] font-semibold uppercase"
                        >
                            {item?.template?.version}
                        </Badge>
                    </div>
                    <p className="mt-1 text-sm font-medium text-slate-700">
                        {item.modelName}
                    </p>
                </button>
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

            <div className="mt-3 grid grid-cols-2 gap-2">
                <div className="rounded-2xl border border-slate-200 px-3 py-3">
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                        Production
                    </p>
                    <span
                        className={cn(
                            "mt-2 inline-flex rounded-full px-2.5 py-1 text-xs font-semibold",
                            getProductionStatusClass(item.production?.status),
                        )}
                    >
                        {item.production?.status || "Idle"}
                    </span>
                    <p className="mt-2 text-xs text-muted-foreground">
                        {item.production?.date || "No date"}
                    </p>
                </div>

                <div className="rounded-2xl border border-slate-200 px-3 py-3">
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                        Installation
                    </p>
                    <Badge
                        variant="secondary"
                        style={{
                            backgroundColor:
                                item.jobCount > 0
                                    ? colorsObject.limeGreen
                                    : colorsObject.dimGray,
                        }}
                        className="mt-2 h-6 whitespace-nowrap px-2 text-xs text-slate-100"
                    >
                        {item.jobCount} submitted
                    </Badge>
                    <p className="mt-2 text-xs text-muted-foreground">
                        {formatDate(item.createdAt)}
                    </p>
                </div>
            </div>

            <div className="mt-4 flex items-center gap-2">
                {item.template ? (
                    <Link
                        href={`/community/${path}/${item.template.slug?.toLowerCase()}`}
                        className="flex-1 rounded-xl border border-slate-200 px-3 py-2 text-center text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50"
                    >
                        Open Template
                    </Link>
                ) : (
                    <div className="flex-1" />
                )}
                <Button
                    type="button"
                    variant="secondary"
                    className="flex-1"
                    onClick={() => {
                        startPrint([item]);
                    }}
                >
                    Print
                </Button>
            </div>
        </div>
    );
}

