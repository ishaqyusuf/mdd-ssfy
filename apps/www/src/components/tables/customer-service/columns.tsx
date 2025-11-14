import { useIsMobile } from "@gnd/ui/hooks/use-mobile";
import { Menu } from "@gnd/ui/custom/menu";
import { RouterOutputs } from "@api/trpc/routers/_app";

import { Button } from "@gnd/ui/button";
import { Icons } from "@gnd/ui/icons";
import { ColumnDef } from "@tanstack/react-table";
import { cn } from "@gnd/ui/cn";
import { useCustomerServiceParams } from "@/hooks/use-customer-service-params";
import { cells } from "@gnd/ui/data-table/cells";
import { formatDate } from "@gnd/utils/dayjs";
import { Item } from "@gnd/ui/composite";
import TextWithTooltip from "@gnd/ui/custom/text-with-tooltip";
import { useMutation, useQuery } from "@tanstack/react-query";
import { _qc, _trpc } from "@/components/static-trpc";
import { ComboboxDropdown } from "@gnd/ui/combobox-dropdown";
import { labelIdOptions } from "@/lib/utils";
import { CheckIcon } from "lucide-react";
import { useTable } from "@gnd/ui/data-table";
import { useMemo } from "react";
import { Progress } from "@gnd/ui/custom/progress";
export type Item =
    RouterOutputs["customerService"]["getCustomerServices"]["data"][number];
interface ItemProps {
    item: Item;
}
export interface TableExtra {
    employees: RouterOutputs["hrm"]["getEmployees"]["data"];
}
type Column = ColumnDef<Item>;

export const columns: Column[] = [
    cells.selectColumn,
    {
        header: "Appointment",
        accessorKey: "Appointment",
        meta: {
            // preventDefault: true,
            className: "w-[150px]",
        },
        cell: ({ row: { original: item } }) => (
            <>
                <Item.Title>{formatDate(item.scheduleDate)}</Item.Title>
                <Item.Description>{item.scheduleTime}</Item.Description>
            </>
        ),
    },
    {
        header: "Customer",
        accessorKey: "Customer",
        meta: {
            // preventDefault: true,
            className: "w-[150px]",
        },
        cell: ({ row: { original: item } }) => (
            <>
                <TextWithTooltip
                    className="max-w-[150px] font-semibold"
                    text={item.homeOwner}
                />
                {/* <Item.Title>{item.homeOwner}</Item.Title> */}
                <Item.Description>{item.homePhone}</Item.Description>
            </>
        ),
    },
    {
        header: "Description",
        accessorKey: "Description",
        meta: {
            // preventDefault: true,
            className: "",
        },
        cell: ({ row: { original: item } }) => (
            <>
                <Item.Title>{item.projectName}</Item.Title>

                <TextWithTooltip
                    className="max-w-[200px] text-secondary-foreground"
                    text={item.description}
                />
            </>
        ),
    },
    {
        header: "Assigned To",
        accessorKey: "Assigned To",
        meta: {
            preventDefault: true,
            className: "w-[150px]",
        },
        cell: ({ row: { original: item } }) => <AssignedTo item={item} />,
    },
    {
        header: "Status",
        accessorKey: "Status",
        meta: {
            // preventDefault: true,
            className: "",
        },
        cell: ({ row: { original: item } }) => (
            <>
                <Progress>
                    <Progress.Status>{item.status}</Progress.Status>
                </Progress>
            </>
        ),
    },
    {
        header: "",
        accessorKey: "action",
        meta: {
            actionCell: true,
            preventDefault: true,
            className: "dt-action-cell",
        },
        cell: ({ row: { original: item } }) => (
            <>
                <Actions item={item} />
            </>
        ),
    },
];
function AssignedTo({ item }: ItemProps) {
    const ctx = useTable();
    const extras: TableExtra = ctx.tableMeta.extras;
    const list = extras.employees;
    const selected = useMemo(() => {
        const _selected = list?.find?.((t) => t.id === item.tech?.id);
        return labelIdOptions([_selected], "name", "id")?.[0];
    }, [list, item?.tech]);

    const { mutate: assign, isPending: isAssigning } = useMutation(
        _trpc.customerService.assignWorkOrder.mutationOptions({
            onSuccess(data, variables, onMutateResult, context) {
                _qc.invalidateQueries({
                    queryKey:
                        _trpc.customerService.getCustomerServices.infiniteQueryKey(),
                });
            },
            onError(error, variables, onMutateResult, context) {},
            meta: {
                toastTitle: {
                    error: "Unable to complete",
                    loading: "Processing...",
                    success: "Done!.",
                },
            },
        })
    );

    return (
        <ComboboxDropdown
            selectedItem={selected}
            onSelect={(data) => {
                assign({
                    userId: data.data.id,
                    woId: item.id,
                });
            }}
            items={labelIdOptions(list, "name", "id")}
            popoverProps={{
                className: cn("!w-auto"),
            }}
            placeholder="Assign"
            listClassName="max-w-auto"
            // disabled
            // renderSelectedItem={(selectedItem) => (
            //     <>
            //         <Item.Title>{selectedItem?.label}</Item.Title>
            //     </>
            // )}
            renderListItem={({ item, isChecked }) => (
                <Item size="xs">
                    <Item.Media>
                        <CheckIcon
                            className={cn(
                                "size-4",
                                item?.id !== selected?.id && "text-transparent"
                            )}
                        />
                    </Item.Media>
                    <Item.Content>
                        <Item.Title className="whitespace-nowrap">
                            {item?.label}
                        </Item.Title>
                    </Item.Content>
                </Item>
            )}
        />
    );
}
function Actions({ item }: ItemProps) {
    const isMobile = useIsMobile();
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
    const { setParams } = useCustomerServiceParams();
    return <></>;
}

