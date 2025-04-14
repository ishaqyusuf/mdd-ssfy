import Money from "@/components/_v1/money";
import {
    ItemsTabProvider,
    useItemsTabContext,
} from "@/components/sheets/sales-overview-sheet/items-tab-context";
import { cn, percent, sum } from "@/lib/utils";

import { Badge } from "@gnd/ui/badge";
import { Label } from "@gnd/ui/label";

import { AdminOnly } from "../../helper";
import { salesOverviewStore } from "../../store";
import { ProductionHeader } from "./header";
import { ItemOverview } from "./item-overview";

export function SalesItemsTab({ productionMode = false }) {
    const store = salesOverviewStore();
    const ctx = useItemsTabContext();
    const itemOverview = store.itemOverview;
    if (!itemOverview) return;
    const { noItem, items, tab, setTab } = ctx;

    return (
        <div className="pb-36">
            <ItemsTabProvider value={ctx}>
                <AdminOnly>
                    <ProductionHeader />
                </AdminOnly>
                {noItem ? (
                    <div className="flex h-[50vh] flex-col items-center justify-center">
                        <Label>No item</Label>
                    </div>
                ) : (
                    items.map((item) => (
                        <div
                            className="flex flex-col gap-2"
                            key={item.itemControlUid}
                        >
                            {item.primary && item.sectionTitle && (
                                <div className="bg-muted py-2 text-center font-mono font-semibold uppercase">
                                    {item.sectionTitle}
                                </div>
                            )}
                            {!item.hidden && item.status?.qty?.total && (
                                <div
                                    className={cn(
                                        item.sectionTitle && "",
                                        "rounded-lg rounded-b-none border border-transparent border-b-muted-foreground/20",
                                        item.itemControlUid != store.itemViewId
                                            ? "cursor-pointer hover:border-muted-foreground/30 hover:bg-muted/80 hover:shadow-lg"
                                            : "border border-muted-foreground/60 bg-muted/30 shadow-sm",
                                        ctx.selectMode && "cursor-pointer",
                                    )}
                                >
                                    <div
                                        className={cn(
                                            "p-2 pt-4 text-sm",
                                            "space-y-2",
                                        )}
                                        onClick={() => {
                                            if (ctx.selectMode) {
                                                ctx.toggeItemSelection(
                                                    item.itemControlUid,
                                                );
                                                return;
                                            }
                                            store.update(
                                                "itemViewId",
                                                item.itemControlUid,
                                            );
                                            store.update("itemView", item);
                                        }}
                                    >
                                        <div className="">
                                            <div className="flex justify-between gap-6">
                                                <div className="flex-1 font-mono font-semibold uppercase">
                                                    {item.title}
                                                    <span>
                                                        {ctx.isSelected(
                                                            item.itemControlUid,
                                                        ) && (
                                                            <Badge>
                                                                Selected
                                                            </Badge>
                                                        )}
                                                    </span>
                                                </div>
                                                <div className="font-mono text-sm font-medium">
                                                    <AdminOnly>
                                                        <Money
                                                            value={
                                                                item.totalCost
                                                            }
                                                        />
                                                    </AdminOnly>
                                                </div>
                                            </div>
                                            <div className="font-mono font-semibold uppercase text-muted-foreground">
                                                <span>
                                                    {item.inlineSubtitle}
                                                </span>
                                            </div>
                                        </div>
                                        {item.lineConfigs?.length && (
                                            <div className="flex justify-end gap-4">
                                                {item.lineConfigs?.map((c) => (
                                                    <Badge
                                                        key={c}
                                                        className="font-mono font-semibold"
                                                        variant="outline"
                                                    >
                                                        {c}
                                                    </Badge>
                                                ))}
                                            </div>
                                        )}

                                        <div className="flex gap-6 pt-2">
                                            <div className="flex flex-1 justify-end">
                                                {item.produceable && (
                                                    <>
                                                        <div className="flex-1">
                                                            <Pill
                                                                label="Assigned"
                                                                value={`${item.status?.prodAssigned?.total}/${item.status?.qty?.total}`}
                                                            />
                                                        </div>
                                                        <div className="flex-1">
                                                            <Pill
                                                                label="Completed"
                                                                value={`${item.status?.prodCompleted?.total}/${item.status?.qty?.total}`}
                                                            />
                                                        </div>
                                                    </>
                                                )}
                                                {item.shippable && (
                                                    <div className="flex-1">
                                                        <Pill
                                                            label="FulFilled"
                                                            value={`${sum([
                                                                item.status
                                                                    ?.dispatchCompleted
                                                                    ?.total,
                                                                item.status
                                                                    ?.dispatchAssigned
                                                                    ?.total,
                                                                item.status
                                                                    ?.dispatchInProgress
                                                                    ?.total,
                                                            ])}/${
                                                                item.status?.qty
                                                                    ?.itemTotal
                                                            }`}
                                                        />
                                                    </div>
                                                )}
                                            </div>
                                            <div className=""></div>
                                        </div>
                                    </div>
                                    {item.itemControlUid == store.itemViewId &&
                                        !ctx.selectMode && <ItemOverview />}
                                </div>
                            )}
                        </div>
                    ))
                )}
            </ItemsTabProvider>
        </div>
    );
}
function Pill({ label, value }) {
    const [score, total] = value
        ?.split(" ")
        ?.filter(Boolean)
        ?.reverse()?.[0]
        ?.split("/");
    const _percent = percent(score, total);
    return (
        <div
            className={cn(
                "flex whitespace-nowrap font-mono text-xs font-semibold uppercase text-muted-foreground",
            )}
        >
            <span
                className={cn(
                    "rounded-full border px-1 shadow",
                    _percent < 100 &&
                        "border-cyan-200 bg-cyan-100 text-cyan-600",
                    !_percent && "border-red-200 bg-red-100 text-red-600",
                    _percent >= 100 &&
                        "border-emerald-200 bg-emerald-100 text-emerald-600",
                )}
            >
                {label}: {value}
            </span>
        </div>
    );
}
