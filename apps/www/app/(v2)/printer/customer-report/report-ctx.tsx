"use client";

import { createContext, use, useContext, useEffect } from "react";
import { usePrintContext } from "../base-printer";
import { BasePrintProps } from "../sales/order-base-printer";
import { GeneratCustomerPrintReport } from "../type";
import Money from "@/components/_v1/money";
import "./style.css";
import Header from "./_components/header";
interface Props {
    action;
    slug;
    className?: string;
}
interface CustomerReportCtxProps
    extends BasePrintProps,
        GeneratCustomerPrintReport {
    // report: GeneratCustomerPrintReport;
}
export const CustomerReportCtx = createContext<CustomerReportCtxProps>(
    null as any,
);
export const useCustomerReportCtx = () =>
    useContext<CustomerReportCtxProps>(CustomerReportCtx);
export default function ReportCtx({ action, slug, className }: Props) {
    const data = use<GeneratCustomerPrintReport>(action);
    const ctx = usePrintContext();
    useEffect(() => {
        if (data) {
            ctx?.pageReady(slug, data);
        }
    }, [data]);

    return (
        <CustomerReportCtx.Provider
            value={
                {
                    ...data,
                } as any
            }
        >
            <div id={`customerReport-${slug}`} className="p-4 print:p-0">
                <table id="main" className="w-full">
                    <Header />
                    <thead id="reportTableHeader">
                        <th colSpan={1}>U/M</th>
                        <th colSpan={1}>Date</th>
                        <th colSpan={10}>Transaction</th>
                        <th colSpan={2}>Amount</th>
                        <th colSpan={2}>Balance</th>
                    </thead>
                    <tbody id="reportBody">
                        {data.reportTable.map((report) => (
                            <tr key={report.id}>
                                <td colSpan={1}></td>
                                <td colSpan={1} align="center">
                                    {report.date}
                                </td>
                                <td colSpan={10}>
                                    {report.amount < -1 ? (
                                        <></>
                                    ) : (
                                        <>
                                            <span>
                                                INV #{report.inv}{" "}
                                                {report.dueDate &&
                                                    `Due: ${report.dueDate}`}
                                            </span>
                                        </>
                                    )}
                                </td>
                                <td colSpan={2} align="right">
                                    <Money noCurrency value={report.amount} />
                                </td>
                                <td colSpan={2} align="right">
                                    <Money noCurrency value={report.balance} />
                                </td>
                            </tr>
                        ))}
                    </tbody>
                    <tfoot>
                        <tr>
                            <td className="p-0" colSpan={16}>
                                <table id="footerTable" className="w-full">
                                    <thead>
                                        <th>CURRENT</th>
                                        <th>
                                            1-30 DAYS PAST
                                            <br />
                                            DUE
                                        </th>
                                        <th>
                                            31-60 DAYS PAST
                                            <br />
                                            DUE
                                        </th>
                                        <th>
                                            61-90 DAYS PAST
                                            <br />
                                            DUE
                                        </th>
                                        <th>OVER 90 DAYS PAST DUE</th>
                                        <th>Amount Due</th>
                                    </thead>
                                    <tbody>
                                        <tr>
                                            <td align="center">
                                                <Money
                                                    noCurrency
                                                    value={
                                                        data.reportFooter
                                                            .current
                                                    }
                                                />
                                            </td>
                                            <td align="center">
                                                <Money
                                                    noCurrency
                                                    value={
                                                        data.reportFooter.past1
                                                    }
                                                />
                                            </td>
                                            <td align="center">
                                                <Money
                                                    noCurrency
                                                    value={
                                                        data.reportFooter.past2
                                                    }
                                                />
                                            </td>
                                            <td align="center">
                                                <Money
                                                    noCurrency
                                                    value={
                                                        data.reportFooter.past3
                                                    }
                                                />
                                            </td>
                                            <td align="center">
                                                <Money
                                                    noCurrency
                                                    value={
                                                        data.reportFooter.over3
                                                    }
                                                />
                                            </td>
                                            <td align="center">
                                                <Money
                                                    value={
                                                        data.reportFooter
                                                            .current
                                                    }
                                                />
                                            </td>
                                        </tr>
                                    </tbody>
                                </table>
                            </td>
                        </tr>
                    </tfoot>
                </table>
            </div>
        </CustomerReportCtx.Provider>
    );
}
