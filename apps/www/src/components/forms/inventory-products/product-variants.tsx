import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@gnd/ui/table";
import { useProductVariants, useVariant, VariantProvider } from "./context";
import { AnimatedNumber } from "@/components/animated-number";
import { useEffect, useRef, useState } from "react";
import { throttle } from "lodash";
import { useMutation } from "@tanstack/react-query";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@gnd/ui/tabs";
import { Icons } from "@gnd/ui/custom/icons";
import { ChartSpline } from "lucide-react";
import { VariantPricingTab } from "./variant-pricing-tab";
import { cn } from "@gnd/ui/cn";

export function ProductVariants() {
    const ctx = useProductVariants();
    const container = useRef(null);
    const containerRef = useRef(null);
    // const { ref: inViewRef, inView } = useInView();
    const [scrolledPast, setScrolledPast] = useState(false);
    useEffect(() => {
        const handleScroll = throttle(() => {
            if (containerRef?.current) {
                const top = (
                    containerRef.current as Element
                ).getBoundingClientRect().top;
                setScrolledPast(top < 45); // when table header goes above 45px, float it
                console.log(top);
            }
        }, 100);
        window.addEventListener("scroll", handleScroll);
        handleScroll(); // initial check
        return () => window.removeEventListener("scroll", handleScroll);
    }, []);
    const VariantHeader = (
        <TableHeader>
            <TableRow>
                <TableHead>Variant</TableHead>
                <TableHead>Cost</TableHead>
                <TableHead>Stock</TableHead>
                <TableHead>Low Stock</TableHead>
                <TableHead></TableHead>
            </TableRow>
        </TableHeader>
    );
    return (
        <div ref={container} className="relative">
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
                    {ctx?.filteredData?.map((fd, i) => (
                        <VariantProvider
                            key={i}
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
        </div>
    );
}

function Row({}) {
    const { setOpened, opened, data } = useVariant();
    const { mutate, data: mutateData } = useMutation({});
    return (
        <>
            <TableRow
                onClick={(e) => {
                    setOpened(!opened);
                }}
                className={cn(!opened || "bg-accent hover:bg-transparent")}
            >
                <TableCell>{data?.title}</TableCell>
                <TableCell>
                    <AnimatedNumber value={data?.price} currency="USD" />
                </TableCell>

                <TableCell>
                    {data?.stockCount ? (
                        <AnimatedNumber value={data?.stockCount} />
                    ) : (
                        "-"
                    )}
                </TableCell>
                <TableCell>
                    {data?.lowStock ? (
                        <AnimatedNumber value={data?.lowStock} />
                    ) : (
                        "-"
                    )}
                </TableCell>
                <TableCell></TableCell>
            </TableRow>
            {!opened || (
                <TableRow className="hover:bg-transparent border-2 border-t-0 shadow-lg">
                    <TableCell colSpan={5} className="">
                        <Tabs defaultValue="price">
                            <TabsList>
                                <TabsTrigger value="price">
                                    <ChartSpline className="size-4 mr-2" />
                                    Pricing
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

