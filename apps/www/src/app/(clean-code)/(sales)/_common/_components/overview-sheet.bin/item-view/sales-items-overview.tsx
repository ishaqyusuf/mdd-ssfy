import { useEffect, useRef, useState } from "react";
import Money from "@/components/_v1/money";
import { DataLine } from "@/components/(clean-code)/data-table/Dl";
import { Menu } from "@/components/(clean-code)/menu";
import Button from "@/components/common/button";
import FormCheckbox from "@/components/common/controls/form-checkbox";
import { cn } from "@/lib/utils";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

import { Badge } from "@gnd/ui/badge";
import {
    Card,
    CardContent,
    CardDescription,
    CardFooter,
    CardHeader,
    CardTitle,
} from "@gnd/ui/card";
import { Form } from "@gnd/ui/form";
import { Label } from "@gnd/ui/label";

import { updateSalesItemControlUseCase } from "../../../use-case/sales-item-control-use-case";
import { GetSalesOverview } from "../../../use-case/sales-item-use-case";
import { useSalesOverview } from "../overview-provider";

export type ItemGroupType = GetSalesOverview["itemGroup"][number];
export type ItemType = ItemGroupType["items"][number];
export type ItemAssignment = ItemType["assignments"][number];
export type ItemAssignmentSubmission = ItemAssignment["submissions"][number];
type PillsType = ItemType["pills"];
type AnalyticsType = ItemType["analytics"];
export function SalesItemsOverview({}) {
    const ctx = useSalesOverview();
    const [showDetails, setShowDetails] = useState({});
    function toggleDetail(id) {
        setShowDetails((val) => {
            return {
                ...val,
                [id]: !val[id],
            };
        });
    }
    useEffect(() => {
        ctx.load();
    }, []);
    return (
        <div>
            {/* <Button onClick={() => ctx.load()}>Refresh</Button> */}
            {ctx.overview?.itemGroup?.map((grp, id) => (
                <div
                    className="sborder srounded-lg sshadow-sm group mx-4 my-1.5 text-sm sm:mx-8"
                    key={id}
                >
                    <Details show={showDetails[id]} group={grp} />
                    {grp.items.map((item, itemId) => (
                        <LineItem
                            key={itemId}
                            className={cn(
                                "",
                                ctx.tabData?.slug == "itemView" &&
                                    ctx.tabData?.meta?.groupIndex == id &&
                                    ctx.tabData?.payloadSlug == itemId
                                    ? "bg-muted-foreground/10"
                                    : item.analytics.control.produceable
                                      ? "cursor-pointer hover:bg-muted-foreground/10"
                                      : null,
                            )}
                            onClick={() => {
                                if (item.analytics.control.produceable)
                                    ctx.openItemTab(id, itemId);
                            }}
                            item={item}
                        />
                    ))}
                </div>
            ))}
        </div>
    );
}
interface LineItemProps {
    className?: string;
    item: ItemType;
    onClick?;
}
export function LineItem({ className = null, item, onClick }: LineItemProps) {
    const ctx = useSalesOverview();
    const menuRef = useRef(null);
    const controlForm = useForm({
        defaultValues: {
            ...item.analytics.control,
        },
    });
    return (
        <div className={cn("my-3 border bg-white sm:rounded-lg", className)}>
            <div onClick={onClick} className="px-4 py-2">
                <div className="flex items-center">
                    <div className="flex-1 uppercase">{item.title}</div>
                    <div className="text-sm font-medium">
                        <Money value={item.total} />
                    </div>
                </div>
                <div className="flex justify-between">
                    <Pills item={item} />
                    <div className="flex-1"></div>
                </div>
            </div>
            {item.analytics?.info && (
                <div className="mt-1 flex justify-between border-t text-xs font-semibold uppercase text-muted-foreground">
                    {/* <div className="flex1"></div> */}
                    <div onClick={onClick} className="flex flex-1 justify-end">
                        {item.analytics?.info?.map((info, k) => (
                            <div className="w-1/3  p-2 px-4 font-mono" key={k}>
                                {info.text}
                            </div>
                        ))}
                    </div>
                    <div className="p-1">
                        <Menu ref={menuRef} triggerSize="sm">
                            <Menu.Item
                                SubMenu={
                                    <Card className="min-w-[240px] border-0">
                                        <CardHeader>
                                            <CardTitle>Item Control</CardTitle>
                                            <CardDescription>
                                                Configure item behaviour
                                            </CardDescription>
                                        </CardHeader>
                                        <CardContent className="grid gap-4">
                                            <Form {...controlForm}>
                                                <FormCheckbox
                                                    label="Production"
                                                    control={
                                                        controlForm.control
                                                    }
                                                    name="produceable"
                                                />
                                                <FormCheckbox
                                                    control={
                                                        controlForm.control
                                                    }
                                                    name="shippable"
                                                    label="Shipping"
                                                />
                                            </Form>
                                        </CardContent>
                                        <CardFooter className="justify-end">
                                            <Button
                                                onClick={async () => {
                                                    await updateSalesItemControlUseCase(
                                                        controlForm.getValues(),
                                                    );
                                                    ctx.refresh();
                                                    toast.success(
                                                        "Item Control Updated",
                                                    );
                                                    menuRef?.current?._onOpenChanged(
                                                        false,
                                                    );
                                                }}
                                            >
                                                Submit
                                            </Button>
                                        </CardFooter>
                                    </Card>
                                }
                            >
                                Configure
                            </Menu.Item>
                        </Menu>
                    </div>
                </div>
            )}
        </div>
    );
}
export function Details({ group, show }: { show; group: ItemGroupType }) {
    if (!show) return null;
    return (
        <div className="ssm:grid-cols-2 grid sm:-mx-8 sm:gap-2">
            {group.style.map((style, id) => (
                <DataLine key={id} {...style} />
            ))}
        </div>
    );
}
function SectionTitle({ title, children }) {
    if (!title && !children) return null;
    return (
        <div className="-mx-4  flex items-center justify-between p-2 sm:-ml-8">
            <Label className="uppercase">{title}</Label>
            <div className="inline-flex space-x-2">{children}</div>
        </div>
    );
}
function Pills({ item }: { item: ItemType }) {
    if (!item.pills.filter((p) => p.value).length) return null;
    return (
        <div className="my-1 flex space-x-4">
            {item.pills
                ?.filter((p) => p.value)
                .map((pill, id) => (
                    <div key={id}>
                        <Badge
                            className="font-mono text-xs uppercase"
                            variant="secondary"
                        >
                            {pill.text}
                        </Badge>
                    </div>
                ))}
        </div>
    );
}
