"use client";
import { useAppSelector } from "@/store";
import { dispatchSlice } from "@/store/slicers";
import { useEffect } from "react";
import BasePrinter from "../base-printer";
import { useState } from "react";
import { WaterMark } from "./water-mark";
import { adjustWatermark } from "@/lib/adjust-watermark";
import { salesPrintAction } from "@/app/(v1)/(loggedIn)/sales/_actions/sales";
import { ISalesOrder } from "@/types/sales";
import { OrderPrintHeader } from "./order-print-header";
import { OrderPrintInvoiceLines } from "./order-print-invoice-lines";
import { OrderPrintFooter } from "./order-print-footer";
import { addPercentage, cn } from "@/lib/utils";
import logo from "@/public/logo.png";
import Link from "next/link";
import Image from "next/image";
import { timeout } from "@/lib/timeout";
import "@/styles/sales.css";
import { printSalesPdf } from "@/app/(v1)/(loggedIn)/sales/_actions/save-pdf";
import { createPortal } from "react-dom";
import { toast } from "sonner";
interface Props {
    preview?;
    mode?;
    mockup?;
    id?;
    prints?;
}
export default function OrderPrinter({
    preview,
    id,
    mockup,
    prints,
    mode,
}: Props) {
    const _printer = useAppSelector((state) => state.slicers.printOrders);
    useEffect(() => {
        print(_printer);
    }, [_printer]);
    useEffect(() => {
        if (id) {
            // console.log(id);
            dispatchSlice("printOrders", {
                mode,
                // pdf: props.pdf,
                mockup,
                ids: Array.isArray(id) ? id : [id],
                isClient: !["production", "packing list"].includes(mode),
                showInvoice: ["order", "quote", "invoice"].includes(mode),
                packingList: mode == "packing list",
                isProd: mode == "production",
            });
        }
    }, [preview, id, mode]);
    const [sales, setSales] = useState<ISalesOrder[]>([]);
    useEffect(() => {
        if (sales?.length > 0 && !(sales?.[0] as any)?.loading) {
            adjustWatermark(sales?.map((s) => s.orderId));
        }
    }, [sales]);
    async function print(printer) {
        if (!printer) return;
        if (printer.pdf) {
            console.log(printer);
            // const resp = await fetch(
            //     `/api/download-sales-pdf?mode=${
            //         printer.mode
            //     }&ids=${printer.ids?.join(",")}`
            // );
            // return;
            const pdf = await printSalesPdf(
                printer.mode,
                printer.ids?.join(","),
            );
            // console.log("DOWNLOAD PDF");
            // console.log(durl);
            const link = document.createElement("a");
            link.href = pdf.uri;
            link.download = pdf.fileName; // [printer.ids.join(","), ".pdf"].join("");
            document.body.appendChild(link);
            link.click();
            dispatchSlice("printOrders", null);
            toast.success("Pdf Exported!.");
            // document.body.removeChild(link);
            return;
        }
        setSales(
            printer.ids.map((slug) => ({
                slug,
                loading: true,
            })) as any,
        );
        const _sales: ISalesOrder[] = (await salesPrintAction({
            ids: printer.ids,
            printMode: printer.mode,
        })) as any;
        const mockup = printer.mockup;
        setSales(
            _sales.map((sale) => {
                const mockPercentage = sale.meta.mockupPercentage;
                if (mockup && mockPercentage > 0) {
                    sale.items = sale.items?.map((item) => {
                        item.rate = addPercentage(item.rate, mockPercentage);
                        item.total = addPercentage(item.total, mockPercentage);
                        return item;
                    });

                    sale.tax = addPercentage(sale.tax, mockPercentage);
                    sale.subTotal = addPercentage(
                        sale.subTotal,
                        mockPercentage,
                    );
                    sale.meta.ccc = addPercentage(
                        sale.meta.ccc,
                        mockPercentage,
                    );
                    sale.grandTotal = addPercentage(
                        sale.grandTotal,
                        mockPercentage,
                    );
                }
                return sale;
            }) as any,
        );
        await timeout(900);
        adjustWatermark(sales?.map((s) => s.orderId));

        if (prints || !id) window.print();
        if (prints) window.close();

        if (!id) dispatchSlice("printOrders", null);
    }
    const Logo = ({}) => (
        <Link href="/">
            <Image
                alt=""
                onLoadingComplete={(img) => {}}
                width={178}
                height={80}
                src={logo}
            />
        </Link>
    );
    function PrintData() {
        return (
            <>
                {sales.map((order, _) => (
                    // <PrintOrderSection index={_} order={order} key={_} />
                    <div id={`salesPrinter`} key={_}>
                        <div
                            id={`s${order.orderId}`}
                            className={cn(_ > 0 && "break-before-page", "")}
                        >
                            <table className="report-table mr-10s w-full text-xs">
                                <OrderPrintHeader Logo={Logo} order={order} />
                                {order.id && (
                                    <>
                                        <OrderPrintInvoiceLines order={order} />
                                        <OrderPrintFooter order={order} />
                                    </>
                                )}
                            </table>
                        </div>
                    </div>
                ))}
                <WaterMark />
            </>
        );
    }
    return id ? (
        (createPortal(<PrintData />, document.body) as any)
    ) : (
        <BasePrinter preview={id != null} id="orderPrintSection">
            <PrintData />
        </BasePrinter>
    );
}
