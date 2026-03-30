import { useIsMobile } from "@gnd/ui/hooks/use-mobile";
import { Menu } from "@gnd/ui/custom/menu";
import { RouterOutputs } from "@api/trpc/routers/_app";
import { Button } from "@gnd/ui/button";
import { Icons } from "@gnd/ui/icons";
import { ColumnDef } from "@tanstack/react-table";
import { cn } from "@gnd/ui/cn";
import { TCell } from "@/components/(clean-code)/data-table/table-cells";
import { formatDate } from "@gnd/utils/dayjs";
import { Progress } from "@gnd/ui/custom/progress";
import { Badge } from "@gnd/ui/badge";
import { colorsObject } from "@gnd/utils/colors";
import { useFilePreviewParams } from "@/hooks/use-file-preview-params";
import QueryString from "qs";
import { useRouter } from "next/navigation";
import { ConfirmBtn } from "@gnd/ui/confirm-button";
import { useMutation } from "@tanstack/react-query";
import { _qc, _trpc } from "@/components/static-trpc";
import { AuthGuard } from "@/components/auth-guard";
import { _perm } from "@/components/sidebar/links";
import Link from "next/link";
import { updateCommunityVersion } from "@/actions/community/update-community-version";
import { openLink } from "@/lib/open-link";
import { toast } from "@gnd/ui/use-toast";
import { useHomeModal } from "@/app-deps/(v1)/(loggedIn)/community/units/home-modal";
export type Item =
    RouterOutputs["community"]["getProjectUnits"]["data"][number];
interface ItemProps {
    item: Item;
}
type Column = ColumnDef<Item>;
const column1: Column = {
    header: "Date",
    accessorKey: "header",
    meta: { sortable: true },
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
    },
    cell: ({ row: { original: item } }) => {
        const route = useRouter();
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
                <TCell.Primary>
                    {item.lotBlock}
                    <Badge
                        variant={
                            item?.template?.version == "v1"
                                ? "secondary"
                                : "success"
                        }
                        className={cn(
                            "px-1 rounded-full text-xs font-semibold absolute -left-10 top-4 font-mono",
                        )}
                    >
                        {item?.template?.version}
                    </Badge>
                </TCell.Primary>
                <TCell.Secondary>{item.modelName}</TCell.Secondary>
            </Link>
        );
    },
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
    meta: {
        preventDefault: true,
    },
    cell: ({ row: { original: item } }) => (
        <>
            <Link
                href={
                    item.jobCount
                        ? `/hrm/contractors/jobs?unitId=${item.id}`
                        : `/`
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
                        `h-5 px-1 whitespace-nowrap  text-xs text-slate-100`,
                    )}
                >
                    {item.jobCount} submitted
                </Badge>
            </Link>
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
    const { setParams } = useFilePreviewParams();
    const ctx = useHomeModal();
    const {
        isPending: isDeleting,
        mutate,
        mutateAsync,
    } = useMutation(
        _trpc.community.deleteUnits.mutationOptions({
            onSuccess(data, variables, onMutateResult, context) {
                _qc.invalidateQueries({
                    queryKey:
                        _trpc.community.getProjectUnits.infiniteQueryKey(),
                });
            },
        }),
    );
    const preview = (version, homeIds: any = "") => {
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
                    SubMenu={
                        <>
                            {["v1", "v2"].map((v) => (
                                <Menu.Item
                                    onClick={(e) => updateVersion(v)}
                                    key={v}
                                >
                                    {v}
                                </Menu.Item>
                            ))}
                        </>
                    }
                >
                    Update Version
                </Menu.Item>
                <Menu.Item
                    Icon={"check"}
                    SubMenu={
                        <>
                            {["v1", "v2"].map((v) => (
                                <Menu.Item onClick={(e) => preview(v)} key={v}>
                                    {v}
                                </Menu.Item>
                            ))}
                        </>
                    }
                >
                    Preview
                </Menu.Item>
                <Menu.Item
                    icon="print"
                    onClick={(e) => {
                        preview(item.template.version, String(item.id));
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
    const path =
        item.template?.version === "v2" ? "model-template" : "community-template";

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
                    asChild
                    type="button"
                    variant="secondary"
                    className="flex-1"
                >
                    <Link href={`/community/project-units/${item.slug}`}>
                        Open Unit
                    </Link>
                </Button>
            </div>
        </div>
    );
}
