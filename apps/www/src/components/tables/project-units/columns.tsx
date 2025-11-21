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
    meta: {
        preventDefault: true,
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
                            "px-1 rounded-full text-xs font-semibold absolute -left-10 top-4 font-mono"
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
                        `h-5 px-1 whitespace-nowrap  text-xs text-slate-100`
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
    const { setParams } = useFilePreviewParams();
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
        })
    );
    const preview = (version, slugs: any = "") => {
        openLink(
            "api/download/model-template",
            {
                preview: true,
                slugs,
                version,
                templateSlug: item.template.slug,
            },
            true
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

