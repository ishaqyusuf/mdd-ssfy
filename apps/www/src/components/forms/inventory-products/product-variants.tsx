import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@gnd/ui/table";
import {
    useProduct,
    useProductVariants,
    useVariant,
    VariantProvider,
} from "./context";
import { AnimatedNumber } from "@/components/animated-number";
import { useEffect, useMemo, useRef, useState } from "react";
import { capitalize, throttle } from "lodash";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@gnd/ui/tabs";
import { Icons } from "@gnd/ui/icons";
import { VariantPricingTab } from "./variant-pricing-tab";
import { cn } from "@gnd/ui/cn";
import { VariantFilters } from "./variant-filters";
import { Progress } from "@gnd/ui/custom/progress";
import { useInventoryParams } from "@/hooks/use-inventory-params";
import { Menu } from "@gnd/ui/custom/menu";
import { Button } from "@gnd/ui/button";
import { INVENTORY_STATUS } from "@sales/constants";
import { getColorFromName } from "@/lib/color";
import { useInventoryTrpc } from "@/hooks/use-inventory-trpc";

export function ProductVariants() {
    const ctx = useProductVariants();
    const product = useProduct();
    const container = useRef(null);
    const containerRef = useRef(null);
    const loadMoreRef = useRef<HTMLDivElement | null>(null);
    // const { ref: inViewRef, inView } = useInView();
    const [scrolledPast, setScrolledPast] = useState(false);
    const [visibleCount, setVisibleCount] = useState(10);
    useEffect(() => {
        const handleScroll = throttle(() => {
            if (containerRef?.current) {
                const top = (
                    containerRef.current as Element
                ).getBoundingClientRect().top;
                setScrolledPast(top < 45); // when table header goes above 45px, float it
            }
        }, 100);
        window.addEventListener("scroll", handleScroll);
        handleScroll(); // initial check
        return () => window.removeEventListener("scroll", handleScroll);
    }, []);
    useEffect(() => {
        setVisibleCount(10);
    }, [ctx.filteredData]);
    useEffect(() => {
        if (!loadMoreRef.current) return;
        if (ctx.filteredData.length <= visibleCount) return;

        const observer = new IntersectionObserver(
            (entries) => {
                if (entries[0]?.isIntersecting) {
                    setVisibleCount((count) =>
                        Math.min(count + 10, ctx.filteredData.length),
                    );
                }
            },
            {
                rootMargin: "160px",
            },
        );

        observer.observe(loadMoreRef.current);
        return () => observer.disconnect();
    }, [ctx.filteredData.length, visibleCount]);
    const visibleRows = useMemo(
        () => ctx.filteredData.slice(0, visibleCount),
        [ctx.filteredData, visibleCount],
    );
    const VariantHeader = (
        <TableHeader>
            <TableRow>
                <TableHead>Variant</TableHead>
                <TableHead>Cost</TableHead>
                {!product.stockMonitor ? null : <TableHead>Stock</TableHead>}
                {!product.stockMonitor ? null : (
                    <TableHead>Low Stock</TableHead>
                )}
                <TableHead>Status</TableHead>
                <TableHead></TableHead>
            </TableRow>
        </TableHeader>
    );
    return (
        <div ref={container} className="relative">
            <VariantFilters />
            {!ctx.hasSearchFilters && !ctx.unfilteredList?.length ? (
                <NoActiveVariants />
            ) : ctx?.hasSearchFilters && !ctx.filteredData?.length ? (
                <EmptyState />
            ) : (
                <>
                    <div className="pb-3 text-sm text-muted-foreground">
                        Showing 1-
                        {Math.min(visibleRows.length, ctx.filteredData.length)}{" "}
                        of {ctx.filteredData.length} variants
                    </div>
                    {scrolledPast && (
                        <div
                            style={{
                                width: `${container?.current?.clientWidth}px`,
                            }}
                            className="fixed top-[45px] bg-accent z-10"
                        >
                            <Table>{VariantHeader}</Table>
                        </div>
                    )}
                    <Table ref={containerRef}>
                        {VariantHeader}
                        <TableBody>
                            {visibleRows.map((fd) => (
                                <VariantProvider
                                    key={fd.uid}
                                    args={[
                                        {
                                            data: fd,
                                        },
                                    ]}
                                >
                                    <Row />
                                </VariantProvider>
                            ))}
                        </TableBody>
                    </Table>
                    {ctx.filteredData.length > visibleRows.length ? (
                        <div
                            ref={loadMoreRef}
                            className="flex justify-center pt-4"
                        >
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() =>
                                    setVisibleCount((count) => count + 10)
                                }
                            >
                                Show More Variants
                            </Button>
                        </div>
                    ) : null}
                </>
            )}
        </div>
    );
}

function Row({}) {
    const { data, opened } = useVariant();
    const { setParams } = useInventoryParams();
    const invTrpc = useInventoryTrpc();
    const product = useProduct();
    return (
        <>
            <TableRow
                onClick={(e) => {
                    // if(!opened)
                    setParams(
                        !opened
                            ? {
                                  editVariantTab: "pricing",
                                  editVariantUid: data.uid,
                              }
                            : {
                                  editVariantTab: null,
                                  editVariantUid: null,
                              },
                    );
                }}
                className={cn(!opened || "bg-accent hover:bg-accent")}
            >
                <TableCell className="uppercase">
                    {data?.title || "DEFAULT"}
                </TableCell>
                <TableCell>
                    {data?.price ? (
                        <AnimatedNumber value={data?.price} currency="USD" />
                    ) : (
                        "-"
                    )}
                </TableCell>

                {!product.stockMonitor ? null : (
                    <TableCell>
                        {data?.stockCount ? (
                            <AnimatedNumber value={data?.stockCount} />
                        ) : (
                            "-"
                        )}
                    </TableCell>
                )}
                {!product.stockMonitor ? null : (
                    <TableCell>
                        {data?.lowStock ? (
                            <AnimatedNumber value={data?.lowStock} />
                        ) : (
                            "-"
                        )}
                    </TableCell>
                )}
                <TableCell onClick={(e) => e.stopPropagation()}>
                    <Menu
                        Trigger={
                            <Button variant="outline">
                                <Progress>
                                    <Progress.Status>
                                        {data?.status}
                                    </Progress.Status>
                                </Progress>
                            </Button>
                        }
                    >
                        {INVENTORY_STATUS.map((status) => (
                            <Menu.Item
                                onClick={(e) => {
                                    invTrpc.mutateUpdateVariantStatus({
                                        status,
                                        attributes: data.attributes,
                                        variantId: data.variantId,
                                        uid: data.uid,
                                        inventoryId: data.inventoryId,
                                    });
                                }}
                                key={status}
                                shortCut={
                                    <div
                                        className="size-2"
                                        style={{
                                            backgroundColor:
                                                getColorFromName(status),
                                        }}
                                    ></div>
                                }
                                icon={capitalize(status) as any}
                            >
                                {capitalize(status)}
                            </Menu.Item>
                        ))}
                    </Menu>
                </TableCell>
                <TableCell></TableCell>
            </TableRow>
            {!opened || (
                <TableRow className="hover:bg-transparent border-2 border-t-0s border-b-3s border-muted-foreground bg-muted">
                    <TableCell
                        colSpan={product.stockMonitor ? 6 : 4}
                        className="bg-white"
                    >
                        <Tabs defaultValue="price">
                            <TabsList>
                                <TabsTrigger value="price">
                                    <Icons.ChartSpline className="size-4 mr-2" />
                                    Pricing
                                </TabsTrigger>
                                <TabsTrigger value="inbound">
                                    <Icons.inbound className="size-4 mr-2" />
                                    Stock Inbound
                                </TabsTrigger>
                                <TabsTrigger value="movement">
                                    <Icons.project className="size-4 mr-2" />
                                    Stock Movement
                                </TabsTrigger>
                                <TabsTrigger value="overview">
                                    <Icons.project className="size-4 mr-2" />
                                    Stock Overview
                                </TabsTrigger>
                            </TabsList>
                            <TabsContent value="price">
                                <VariantPricingTab />
                            </TabsContent>
                        </Tabs>
                    </TableCell>
                </TableRow>
            )}
        </>
    );
}

function NoActiveVariants({}) {
    const ctx = useProductVariants();
    // design a no active variants empty state, with information about drafted variants and inactive variants;
    const inactiveCount = ctx.unfilteredList?.filter(
        (a) => !a.variantId,
    )?.length;
    const draftCount = ctx.unfilteredList?.filter(
        (a) => a.variantId && a.status == "draft",
    )?.length;

    let message = "";
    if (draftCount > 0 && inactiveCount > 0) {
        message = `You have ${draftCount} draft variant(s) and ${inactiveCount} inactive variant(s).`;
    } else if (draftCount > 0) {
        message = `You have ${draftCount} draft variant(s).`;
    } else if (inactiveCount > 0) {
        message = `You have ${inactiveCount} inactive variant(s).`;
    }

    return (
        <div className={cn("flex h-[30vh] items-center justify-center")}>
            <div className="flex flex-col items-center text-center">
                <Icons.products className="mb-4" />
                <div className="mb-6 space-y-2">
                    <h2 className="text-lg font-medium">No active variants</h2>
                    <p className="text-sm text-[#606060]">
                        There are no active variants to display.
                    </p>
                    {message && (
                        <p className="text-sm text-[#606060]">{message}</p>
                    )}
                </div>
            </div>
        </div>
    );
}
export function EmptyState() {
    // if (!props.empty) return props.children;

    return (
        <div className={cn("flex h-[30vh] items-center justify-center")}>
            <div className="flex flex-col items-center">
                <Icons.products className="mb-4" />
                <div className="mb-6 space-y-2 text-center">
                    <h2 className="text-lg font-medium">{"No results"}</h2>
                    <p className="text-sm text-[#606060]">
                        {"You have not created any data yet"}
                    </p>
                </div>
            </div>
        </div>
    );
}

