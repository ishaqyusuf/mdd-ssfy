import { useIsMobile } from "@gnd/ui/hooks/use-mobile";
import { Menu } from "@gnd/ui/custom/menu";
import { RouterOutputs } from "@api/trpc/routers/_app";

import { Button } from "@gnd/ui/button";
import { Icons } from "@gnd/ui/icons";
import { ColumnDef } from "@tanstack/react-table";
import { cn } from "@gnd/ui/cn";
import { useCommunityProjectParams } from "@/hooks/use-community-project-params";
import { TCell } from "@/components/(clean-code)/data-table/table-cells";
import { formatDate } from "@gnd/utils/dayjs";
import { useMutation } from "@tanstack/react-query";
import { _trpc } from "@/components/static-trpc";
import ProjectModal from "@/app-deps/(v1)/(loggedIn)/community/projects/project-modal";
import ConfirmBtn from "@/components/_v1/confirm-btn";
import { useModal } from "@/components/common/modal/provider";
import AddonCell from "./addon-cell";
import Link from "next/link";
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
        preventDefault: true,
    },
    cell: ({ row: { original: item } }) => (
        <>
            <AddonCell project={item} />
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
    const {} = useMutation(
        _trpc.community.deleteUnits.mutationOptions({
            onSuccess(data, variables, onMutateResult, context) {},
        }),
    );

    const modal = useModal();
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
            {/* <Button
                disabled
                onClick={(e) => {
                    modal.openModal(<ProjectModal data={item as any} />);
                }}
            >
                <Icons.Edit className="size-4" />
            </Button> */}
            <ConfirmBtn
                // onClick={() => {}}
                trash
                variant="outline"
                className="px-2"
                size="sm"
            />
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
    const { setParams } = useCommunityProjectParams();
    return (
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex items-start gap-3">
                <button
                    type="button"
                    onClick={() => {
                        setParams({
                            openCommunityProjectId: item.id,
                        });
                    }}
                    className="min-w-0 flex-1 text-left"
                >
                    <p className="text-base font-semibold text-slate-900">
                        {item.title}
                    </p>
                    <p className="mt-1 text-sm text-muted-foreground">
                        {item.builder?.name}
                    </p>
                </button>
                <div className="shrink-0">
                    <Actions item={item} />
                </div>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-2">
                <div className="rounded-2xl border border-slate-200 px-3 py-3">
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                        Ref No
                    </p>
                    <p className="mt-1 text-sm font-semibold text-slate-900">
                        {item.refNo}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                        {formatDate(item.createdAt)}
                    </p>
                </div>

                <div className="rounded-2xl border border-slate-200 px-3 py-3">
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                        Units
                    </p>
                    <p className="mt-1 text-lg font-semibold text-slate-900">
                        {item._count.homes}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                        Total homes
                    </p>
                </div>
            </div>

            <div className="mt-3 rounded-2xl bg-slate-50 px-3 py-3">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                    Supervisor
                </p>
                <p className="mt-1 text-sm font-semibold text-slate-900">
                    {item.meta?.supervisor?.name || "Not assigned"}
                </p>
            </div>

            <div className="mt-3 rounded-2xl border border-slate-200 px-3 py-3">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                    Addon
                </p>
                <div className="mt-2">
                    <AddonCell project={item} />
                </div>
            </div>

            <div className="mt-4 flex items-center gap-2">
                <Link
                    href={`/community/project-units?projectSlug=${item.slug}`}
                    className="flex-1 rounded-xl bg-emerald-600 px-3 py-2 text-center text-sm font-semibold text-white transition-colors hover:bg-emerald-700"
                >
                    Open Units
                </Link>
            </div>
        </div>
    );
}
