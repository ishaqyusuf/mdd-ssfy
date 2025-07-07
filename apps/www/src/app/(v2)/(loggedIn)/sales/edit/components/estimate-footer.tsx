import { Fragment, useContext, useEffect, useRef, useState } from "react";
import Money from "@/components/_v1/money";
import { useLoader } from "@/lib/use-loader";
import { cn } from "@/lib/utils";
import { useFormContext } from "react-hook-form";

import { Input } from "@gnd/ui/input";
import {
    Select,
    SelectContent,
    SelectGroup,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@gnd/ui/select";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableRow,
} from "@gnd/ui/table";

import salesData from "../../sales-data";
import { SalesFormContext } from "../ctx";
import { ISalesForm } from "../type";

export default function EstimateFooter({}) {
    const [floatingFooter, setFloatingFooter] = useState(false);
    const hideFooter = useLoader();
    const tableRef = useRef(null);
    const form = useFormContext<ISalesForm>();
    // const grandTotal = form.watch("grandTotal");
    useEffect(() => {
        const handleIntersection = (entries) => {
            const [entry] = entries;
            console.log([entry]);
            setFloatingFooter(entry.isIntersecting == false);
        };
        const observer = new IntersectionObserver(handleIntersection, {
            // rootMargin: "0px 0px 0px 0px",
        });

        if (tableRef.current) {
            observer.observe(tableRef.current);
        }

        return () => {
            if (tableRef.current) {
                observer.unobserve(tableRef.current);
            }
        };
    }, [hideFooter.isLoading]);

    return (
        <div className={floatingFooter ? "mt-16" : "mt-0"}>
            <div id="lastLine" ref={tableRef} className=""></div>
            {floatingFooter ? (
                <div className="fixed bottom-0 left-0  right-0 mb-6 md:grid  md:grid-cols-[220px_minmax(0,1fr)] lg:grid-cols-[240px_minmax(0,1fr)]">
                    <div className="hidden  md:block" />
                    <div className="lg:gap-10 2xl:grid 2xl:grid-cols-[1fr_300px] ">
                        <Footer floatingFooter />
                    </div>
                </div>
            ) : (
                <div className="flex w-full items-end">
                    <div className="flex-1" />
                    <Footer />
                </div>
            )}
        </div>
    );
}
function Footer({
    floatingFooter,
    className,
}: {
    floatingFooter?;
    className?;
}) {
    const form = useFormContext<ISalesForm>();
    const {
        paymentOption,
        taxPercentage,
        grandTotal,
        subTotal,
        tax,
        ccc,
        cccPercentage,
    } = useContext(SalesFormContext);

    const X = !floatingFooter ? TableRow : ({ children }) => children;
    const FloatRow = floatingFooter ? TableRow : Fragment;
    return (
        <div
            className={cn(
                className,
                "z-10 border border-slate-300 bg-slate-50 shadow-xl",
                floatingFooter ? "rounded-full" : "rounded p-2",
            )}
        >
            <Table id="invoiceFooter" className="w-full">
                <TableBody>
                    <FloatRow>
                        <X>
                            <TableHead>Payment Option</TableHead>
                            <TableCell className="p-1">
                                <Select
                                    value={paymentOption}
                                    onValueChange={(value) => {
                                        form.setValue(
                                            "meta.payment_option" as any,
                                            value as any,
                                        );
                                    }}
                                >
                                    <SelectTrigger className="h-6 w-[120px]">
                                        <SelectValue placeholder="" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectGroup>
                                            {salesData.paymentOptions.map(
                                                (opt, i) => (
                                                    <SelectItem
                                                        value={opt}
                                                        key={i}
                                                    >
                                                        {opt}
                                                    </SelectItem>
                                                ),
                                            )}
                                        </SelectGroup>
                                    </SelectContent>
                                </Select>
                            </TableCell>
                        </X>
                        <X>
                            <TableHead>Labour</TableHead>
                            <TableCell className="p-1">
                                <Input
                                    {...form.register("meta.labor_cost")}
                                    className="h-6 w-16"
                                    prefix="$"
                                />
                            </TableCell>
                        </X>
                        <X>
                            <TableHead>Discount</TableHead>
                            <TableCell className="p-1">
                                <Input
                                    {...form.register("meta.discount")}
                                    className="h-6 w-16"
                                    prefix="$"
                                />
                            </TableCell>
                        </X>
                        <X>
                            <TableHead>Sub Total</TableHead>
                            <TableCell className="whitespace-nowrap p-1">
                                <Money value={subTotal || 0} />
                            </TableCell>
                        </X>
                        <X>
                            <TableHead>Tax ({taxPercentage}%)</TableHead>
                            <TableCell className="whitespace-nowrap p-1">
                                <Money value={tax || 0} />
                            </TableCell>
                        </X>
                        {ccc ? (
                            <X>
                                <TableHead>C.C.C ({cccPercentage}%)</TableHead>
                                <TableCell className="whitespace-nowrap p-1">
                                    <Money value={ccc || 0} />
                                </TableCell>
                            </X>
                        ) : null}
                        <X>
                            <TableHead>Total</TableHead>
                            <TableCell className="whitespace-nowrap p-1">
                                <Money value={grandTotal || 0} />
                            </TableCell>
                        </X>
                    </FloatRow>
                </TableBody>
            </Table>
        </div>
    );
}
