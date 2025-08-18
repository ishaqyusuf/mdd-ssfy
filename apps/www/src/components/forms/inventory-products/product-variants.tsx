import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@gnd/ui/table";
import { useProductVariant } from "./context";
import { AnimatedNumber } from "@/components/animated-number";
import { useEffect, useRef, useState } from "react";
import { throttle } from "lodash";
import { useMutation } from "@tanstack/react-query";
import { Tabs, TabsList, TabsTrigger } from "@gnd/ui/tabs";

export function ProductVariants() {
    const ctx = useProductVariant();
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
                        <Row key={i} data={fd}></Row>
                    ))}
                </TableBody>
            </Table>
        </div>
    );
}

function Row({ data }) {
    const [opened, setOpened] = useState(false);
    const { mutate, data: mutateData } = useMutation({});
    return (
        <>
            <TableRow
                onClick={(e) => {
                    setOpened(!opened);
                }}
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
            </TableRow>
            {!opened || (
                <TableRow className="hover:bg-transparent">
                    <TableCell colSpan={5} className="">
                        <Tabs>
                            <TabsList>
                                <TabsTrigger value="price">Pricing</TabsTrigger>
                            </TabsList>
                        </Tabs>
                    </TableCell>
                </TableRow>
            )}
        </>
    );
}

