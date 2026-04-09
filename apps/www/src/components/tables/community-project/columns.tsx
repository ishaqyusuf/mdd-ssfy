"use client";

import { Icons } from "@gnd/ui/icons";

import ProjectModal from "@/app-deps/(v1)/(loggedIn)/community/projects/project-modal";
import { deleteProjectAction } from "@/app-deps/(v1)/(loggedIn)/community/projects/actions/delete-project-action";
import { useModal } from "@/components/common/modal/provider";
import {
    updateProjectArchivedAction,
    updateProjectSupervisorAction,
} from "@/actions/community/project-actions";
import AddonCell from "./addon-cell";
import { formatDate } from "@gnd/utils/dayjs";
import type { RouterOutputs } from "@api/trpc/routers/_app";
import type { ColumnDef } from "@tanstack/react-table";
import { Badge } from "@gnd/ui/badge";
import { Button } from "@gnd/ui/button";
import { Item } from "@gnd/ui/namespace";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@gnd/ui/dropdown-menu";
import { Input } from "@gnd/ui/input";
import { Label } from "@gnd/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@gnd/ui/popover";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

export type ItemType =
    RouterOutputs["community"]["getCommunityProjects"]["data"][number];

type Column = ColumnDef<ItemType>;

function statusClasses(archived?: boolean | null) {
    return archived
        ? "border-amber-200 bg-amber-50 text-amber-700"
        : "border-emerald-200 bg-emerald-50 text-emerald-700";
}

function getProductionMeta(item: ItemType) {
    const total = item.homeTasks?.length || 0;
    const completed =
        item.homeTasks?.filter((task) => task.producedAt).length || 0;
    const started =
        item.homeTasks?.filter((task) => !task.producedAt && task.prodStartedAt)
            .length || 0;
    const queued =
        item.homeTasks?.filter(
            (task) =>
                !task.producedAt &&
                !task.prodStartedAt &&
                task.sentToProductionAt,
        ).length || 0;
    const idle = Math.max(total - completed - started - queued, 0);

    let label = "Idle";
    if (!total) label = "No tasks";
    else if (completed === total) label = "Completed";
    else if (started > 0 || completed > 0) label = "Started";
    else if (queued > 0) label = "Queued";

    return {
        total,
        completed,
        started,
        queued,
        idle,
        label,
    };
}

function SupervisorCell({ item }: { item: ItemType }) {
    const router = useRouter();
    const [open, setOpen] = useState(false);
    const [isPending, startTransition] = useTransition();
    const [supervisor, setSupervisor] = useState({
        name: item.meta?.supervisor?.name || "",
        email: item.meta?.supervisor?.email || "",
    });

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                <Button
                    variant="outline"
                    size="sm"
                    className="h-8 justify-start px-3"
                >
                    {item.meta?.supervisor?.name ? (
                        <span className="truncate text-left">
                            {item.meta.supervisor.name}
                            {item.meta.supervisor.email
                                ? ` • ${item.meta.supervisor.email}`
                                : ""}
                        </span>
                    ) : (
                        <>
                            <Icons.UserPlus className="mr-2 size-4" />
                            Add supervisor
                        </>
                    )}
                </Button>
            </PopoverTrigger>
            <PopoverContent align="start" className="w-72 space-y-3 p-4">
                <div className="space-y-1">
                    <h4 className="text-sm font-semibold text-slate-900">
                        Update supervisor
                    </h4>
                    <p className="text-xs text-slate-500">
                        Save a direct owner for this project so operations can
                        route follow-ups quickly.
                    </p>
                </div>
                <div className="space-y-2">
                    <Label htmlFor={`supervisor-name-${item.id}`}>Name</Label>
                    <Input
                        id={`supervisor-name-${item.id}`}
                        value={supervisor.name}
                        onChange={(event) =>
                            setSupervisor((prev) => ({
                                ...prev,
                                name: event.target.value,
                            }))
                        }
                        placeholder="Supervisor name"
                    />
                </div>
                <div className="space-y-2">
                    <Label htmlFor={`supervisor-email-${item.id}`}>Email</Label>
                    <Input
                        id={`supervisor-email-${item.id}`}
                        value={supervisor.email}
                        onChange={(event) =>
                            setSupervisor((prev) => ({
                                ...prev,
                                email: event.target.value,
                            }))
                        }
                        placeholder="Supervisor email"
                    />
                </div>
                <div className="flex justify-between gap-2">
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                            startTransition(async () => {
                                await updateProjectSupervisorAction({
                                    projectId: item.id,
                                    supervisor: {},
                                });
                                router.refresh();
                                setOpen(false);
                            });
                        }}
                        disabled={isPending}
                    >
                        Clear
                    </Button>
                    <Button
                        size="sm"
                        onClick={() => {
                            startTransition(async () => {
                                await updateProjectSupervisorAction({
                                    projectId: item.id,
                                    supervisor,
                                });
                                router.refresh();
                                setOpen(false);
                            });
                        }}
                        disabled={isPending}
                    >
                        Save
                    </Button>
                </div>
            </PopoverContent>
        </Popover>
    );
}

function Actions({ item }: { item: ItemType }) {
    const router = useRouter();
    const modal = useModal();
    const [isPending, startTransition] = useTransition();

    return (
        <div className="relative z-10 flex justify-end">
            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <Button
                        variant="ghost"
                        size="icon"
                        className="size-8"
                        onClick={(event) => event.stopPropagation()}
                    >
                        <Icons.MoreHorizontal className="size-4" />
                    </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent
                    align="end"
                    onClick={(event) => event.stopPropagation()}
                >
                    <DropdownMenuItem asChild>
                        <Link href={`/community/projects/${item.slug}`}>
                            <Icons.Building2 className="mr-2 size-4" />
                            Open overview
                        </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                        <Link
                            href={`/community/project-units?projectSlug=${item.slug}`}
                        >
                            <Icons.Building2 className="mr-2 size-4" />
                            Open units
                        </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem
                        onClick={() =>
                            modal.openModal(<ProjectModal data={item as any} />)
                        }
                    >
                        <Icons.Pencil className="mr-2 size-4" />
                        Edit project
                    </DropdownMenuItem>
                    <DropdownMenuItem
                        onClick={() => {
                            startTransition(async () => {
                                await updateProjectArchivedAction({
                                    projectIds: [item.id],
                                    archived: !item.archived,
                                });
                                router.refresh();
                            });
                        }}
                        disabled={isPending}
                    >
                        <Icons.FolderArchive className="mr-2 size-4" />
                        {item.archived ? "Mark active" : "Archive project"}
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                        className="text-destructive focus:text-destructive"
                        onClick={() => {
                            startTransition(async () => {
                                await deleteProjectAction(item.id);
                                router.refresh();
                            });
                        }}
                        disabled={isPending}
                    >
                        <Icons.Trash2 className="mr-2 size-4" />
                        Delete project
                    </DropdownMenuItem>
                </DropdownMenuContent>
            </DropdownMenu>
        </div>
    );
}

const refDate: Column = {
    header: "Ref / Date",
    accessorKey: "refNo",
    meta: {
        className: "w-36",
    },
    cell: ({ row: { original: item } }) => (
        <>
            <Item.Title>{item.refNo || "No ref"}</Item.Title>
            <Item.Description>{formatDate(item.createdAt)}</Item.Description>
        </>
    ),
};

const project: Column = {
    header: "Project",
    accessorKey: "title",
    cell: ({ row: { original: item } }) => (
        <>
            <Item.Title>{item.title}</Item.Title>
            <Item.Description>
                {item.builder?.name || "No builder"}
            </Item.Description>
        </>
    ),
};

const status: Column = {
    header: "Status",
    accessorKey: "archived",
    meta: {
        className: "w-28",
    },
    cell: ({ row: { original: item } }) => (
        <Badge variant="outline" className={statusClasses(item.archived)}>
            {item.archived ? "Archived" : "Active"}
        </Badge>
    ),
};

const supervisor: Column = {
    header: "Supervisor",
    accessorKey: "supervisor",
    meta: {
        className: "min-w-[240px]",
        preventDefault: true,
    },
    cell: ({ row: { original: item } }) => <SupervisorCell item={item} />,
};

const units: Column = {
    header: "Units",
    accessorKey: "units",
    meta: {
        className: "w-20",
    },
    cell: ({ row: { original: item } }) => (
        <Item.Title className="text-center">{item._count.homes}</Item.Title>
    ),
};

const production: Column = {
    header: "Production",
    accessorKey: "production",
    cell: ({ row: { original: item } }) => {
        const productionMeta = getProductionMeta(item);

        return (
            <>
                <Item.Title>{productionMeta.label}</Item.Title>
                <Item.Description>
                    {productionMeta.completed}/{productionMeta.total} completed
                </Item.Description>
            </>
        );
    },
};

const finance: Column = {
    header: "Jobs / Invoices",
    accessorKey: "finance",
    cell: ({ row: { original: item } }) => (
        <>
            <Item.Title>{item._count.jobs} jobs</Item.Title>
            <Item.Description>{item._count.invoices} invoices</Item.Description>
        </>
    ),
};

const lastActivity: Column = {
    header: "Last activity",
    accessorKey: "updatedAt",
    meta: {
        className: "w-36",
    },
    cell: ({ row: { original: item } }) => (
        <>
            <Item.Title>{formatDate(item.updatedAt)}</Item.Title>
            <Item.Description>Updated</Item.Description>
        </>
    ),
};

const addons: Column = {
    header: "Addon",
    accessorKey: "addons",
    meta: {
        preventDefault: true,
        className: "min-w-[140px]",
    },
    cell: ({ row: { original: item } }) => <AddonCell project={item} />,
};

export const columns: Column[] = [
    refDate,
    project,
    status,
    supervisor,
    units,
    production,
    finance,
    // lastActivity,
    addons,
    {
        header: "",
        accessorKey: "action",
        meta: {
            actionCell: true,
            preventDefault: true,
            className: "w-[72px]",
        },
        cell: ({ row: { original: item } }) => <Actions item={item} />,
    },
];

export const mobileColumn: ColumnDef<ItemType>[] = [
    {
        header: "",
        accessorKey: "row",
        meta: {
            className: "flex-1 p-0",
        },
        cell: ({ row: { original: item } }) => {
            const productionMeta = getProductionMeta(item);

            return (
                <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                    <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                            <p className="truncate text-base font-semibold text-slate-900">
                                {item.title}
                            </p>
                            <p className="mt-1 text-sm text-slate-500">
                                {item.builder?.name || "No builder"}
                            </p>
                        </div>
                        <Actions item={item} />
                    </div>

                    <div className="mt-3 flex items-center gap-2">
                        <Badge
                            variant="outline"
                            className={statusClasses(item.archived)}
                        >
                            {item.archived ? "Archived" : "Active"}
                        </Badge>
                        <span className="text-xs text-slate-500">
                            {item.refNo || "No ref"}
                        </span>
                    </div>

                    <div className="mt-4 grid grid-cols-2 gap-2">
                        <div className="rounded-xl border border-slate-200 px-3 py-2">
                            <p className="text-[11px] uppercase tracking-[0.16em] text-slate-400">
                                Units
                            </p>
                            <p className="mt-1 text-lg font-semibold text-slate-950">
                                {item._count.homes}
                            </p>
                        </div>
                        <div className="rounded-xl border border-slate-200 px-3 py-2">
                            <p className="text-[11px] uppercase tracking-[0.16em] text-slate-400">
                                Production
                            </p>
                            <p className="mt-1 text-sm font-semibold text-slate-950">
                                {productionMeta.label}
                            </p>
                            <p className="text-xs text-slate-500">
                                {productionMeta.completed}/
                                {productionMeta.total} completed
                            </p>
                        </div>
                        <div className="rounded-xl border border-slate-200 px-3 py-2">
                            <p className="text-[11px] uppercase tracking-[0.16em] text-slate-400">
                                Jobs
                            </p>
                            <p className="mt-1 text-lg font-semibold text-slate-950">
                                {item._count.jobs}
                            </p>
                        </div>
                        <div className="rounded-xl border border-slate-200 px-3 py-2">
                            <p className="text-[11px] uppercase tracking-[0.16em] text-slate-400">
                                Invoices
                            </p>
                            <p className="mt-1 text-lg font-semibold text-slate-950">
                                {item._count.invoices}
                            </p>
                        </div>
                    </div>

                    <div className="mt-3">
                        <SupervisorCell item={item} />
                    </div>

                    <div className="mt-3">
                        <AddonCell project={item} />
                    </div>

                    <div className="mt-4 grid grid-cols-2 gap-2">
                        <Button asChild variant="outline">
                            <Link
                                href={`/community/project-units?projectSlug=${item.slug}`}
                            >
                                Open units
                            </Link>
                        </Button>
                        <Button asChild>
                            <Link href={`/community/projects/${item.slug}`}>
                                Open overview
                            </Link>
                        </Button>
                    </div>
                </div>
            );
        },
    },
];

