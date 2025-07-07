"use client";

import React, { useContext, useEffect, useState } from "react";
import Money from "@/components/_v1/money";
import FormInput from "@/components/common/controls/form-input";
import FormSelect from "@/components/common/controls/form-select";
import { formatMoney } from "@/lib/use-number";
import { cn, generateRandomString } from "@/lib/utils";

import { Label } from "@gnd/ui/label";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@gnd/ui/table";

import { useDykeForm } from "../_hooks/form-context";
import salesData from "../../../sales/sales-data";

import "./style.css";

import TaxModal from "@/app/(clean-code)/(sales)/_common/_modals/tax-modal/tax-modal";
import { useLegacyDykeForm } from "@/app/(clean-code)/(sales)/sales-book/(form)/_hooks/legacy-hooks";
import { Icons } from "@/components/_v1/icons";
import { TableCol } from "@/components/common/data-table/table-cells";
import { useModal } from "@/components/common/modal/provider";
import {
    FieldArray,
    useFieldArray,
    UseFieldArrayReturn,
} from "react-hook-form";

import { Button } from "@gnd/ui/button";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@gnd/ui/select";

import { DykeForm } from "../../type";
import { calculateFooterEstimate } from "../footer-estimate";

const defaultValues = {
    taxPercentage: null,
    tax: null,
    grandTotal: null,
    subTotal: null,
    ccc: null,
    orderTax: null,
    floating: false,
};
type ICtx = typeof defaultValues & {
    taxForm?: {
        listArray?: UseFieldArrayReturn<DykeForm, "_taxForm.taxList", "_id">;
        selectionArray?: UseFieldArrayReturn<
            DykeForm,
            "_taxForm.selection",
            "_id"
        >;
        taxSelect;
        setTaxSelect;
    };
};
const ctx = React.createContext<ICtx>(defaultValues);
type CtxKeys = keyof typeof defaultValues;

export default function DykeSalesFooterSection({}) {
    const form = useDykeForm();

    const [
        orderTax,
        footerPrices,
        laborCost,
        discount,
        taxPercentage,
        tax,
        ccc,
        paymentOption,
        cccPercentage,
        grandTotal,
        subTotal,
        taxChanged,
        priceRefresh,
    ] = form.watch([
        "order.meta.tax",
        "footer.footerPrices",
        "order.meta.labor_cost",
        "order.meta.discount",
        "order.taxPercentage",
        "order.tax",
        "order.meta.ccc",
        "order.meta.payment_option",
        "order.meta.ccc_percentage",
        "order.grandTotal",
        "order.subTotal",
        "_taxForm.taxChangedCode",
        "priceRefresh" as any,
    ]);
    const mainCtx = useLegacyDykeForm();
    const { taxListFieldArray, taxSelectionFieldArray } = mainCtx.footerCtx;
    useEffect(() => {
        const estimate = calculateFooterEstimate(form.getValues(), {
            cccPercentage,
            footerPrices,
            laborCost,
            paymentOption,
            discount,
            orderTax,
        });

        form.setValue("order.meta.ccc", estimate.ccc);
        form.setValue("order.tax", formatMoney(estimate.tax));
        form.setValue("order.subTotal", formatMoney(estimate.subTotal));
        form.setValue("order.grandTotal", estimate.grandTotal);
        Object.entries(estimate.taxForm.taxByCode).map(([k, v]) => {
            form.setValue(`_taxForm.taxCostsByCode.${k}`, v.data?.tax);
            form.setValue(`_taxForm.taxByCode.${k}.data.tax`, v.data?.tax);
            form.setValue(
                `_taxForm.taxByCode.${k}.data.taxxable`,
                v.data?.taxxable,
            );
        });
        // estimate.taxes.map((tax) => {
        //     form.setValue(
        //         `_taxForm.taxByCode.${tax.data.taxCode}.data.tax` as any,
        //         tax.data.tax
        //     );
        //     form.setValue(
        //         `_taxForm.taxByCode.${tax.data.taxCode}.data.taxxable` as any,
        //         tax.data.taxxable
        //     );
        // });
    }, [
        footerPrices,
        paymentOption,
        laborCost,
        discount,
        orderTax,
        taxChanged,
        priceRefresh,
    ]);
    const [taxSelect, setTaxSelect] = useState(null);
    const ctxValue: ICtx = {
        // footerPrices,
        // laborCost,
        // discount,
        taxPercentage,
        tax,
        ccc,
        // cccPercentage,
        grandTotal,
        orderTax,
        subTotal,
        floating: false,
        taxForm: {
            listArray: taxListFieldArray,
            selectionArray: taxSelectionFieldArray,
            taxSelect,
            setTaxSelect,
        },
    };
    return (
        <div className="mb-16">
            <ctx.Provider
                value={{
                    ...ctxValue,
                }}
            >
                <Footer />
            </ctx.Provider>
            <ctx.Provider
                value={{
                    ...ctxValue,
                    floating: true,
                }}
            >
                <FloatingFooter />
            </ctx.Provider>
        </div>
    );
}
function CustomTableCell({ children }) {
    return (
        <TableCell align="right" className="flex w-full p-1">
            <div className="flex items-center justify-end ">{children}</div>
        </TableCell>
    );
}
function XTableHead({ children }) {
    return <TableHead className="h-auto p-1">{children}</TableHead>;
}
const Details = {
    PaymentOptions() {
        const form = useDykeForm();
        return (
            <>
                <TableHead className={cn()}>Payment</TableHead>
                <CustomTableCell>
                    <FormSelect
                        size="sm"
                        control={form.control}
                        className={cn("")}
                        onSelect={(e) => {
                            console.log(e);
                        }}
                        name={"order.meta.payment_option"}
                        options={salesData.paymentOptions}
                    />
                </CustomTableCell>
            </>
        );
    },
    Discount() {
        const form = useDykeForm();
        return (
            <>
                <TableHead className={cn()}>Discount</TableHead>
                <CustomTableCell>
                    <FormInput
                        size="sm"
                        type="number"
                        control={form.control}
                        className={cn("")}
                        name={"order.meta.discount"}
                    />
                </CustomTableCell>
            </>
        );
    },
    Labour() {
        const form = useDykeForm();
        return (
            <>
                <TableHead className={cn()}>Labour</TableHead>
                <CustomTableCell>
                    <FormInput
                        size="sm"
                        type="number"
                        control={form.control}
                        className={cn("")}
                        name={"order.meta.labor_cost"}
                    />
                </CustomTableCell>
            </>
        );
    },
    Line({ title, valueKey }: { title?; valueKey: CtxKeys }) {
        const _ctx = useContext(ctx);
        if (_ctx.floating)
            return (
                <TableCell className="p-1">
                    <div className="flex items-center space-x-2">
                        <TableCol.Secondary>{title}</TableCol.Secondary>

                        <Label>
                            <Money value={_ctx?.[valueKey]} />
                        </Label>
                    </div>
                </TableCell>
            );
        return (
            <>
                <XTableHead>{title}</XTableHead>
                <CustomTableCell>
                    <Label>
                        <Money value={_ctx?.[valueKey]} />
                    </Label>
                </CustomTableCell>
            </>
        );
    },
};
function FloatingFooter() {
    const _ctx = useContext(ctx);
    return (
        <div className="smd:grid-cols-[220px_minmax(0,1fr)] fixed bottom-0  left-0 right-0 mb-6  md:grid lg:grid-cols-[240px_minmax(0,1fr)]">
            <div className="hidden  md:block" />
            <div className="mx-2 lg:gap-10 2xl:grid 2xl:grid-cols-[1fr_300px]">
                {/* <Footer floatingFooter /> */}
                <div className="flex rounded-lg border bg-white p-1 shadow dark:bg-muted">
                    <Table>
                        <TableBody>
                            <TableRow>
                                {/* <Details.PaymentOptions />
                                <Details.Labour /> <Details.Discount /> */}
                                <Details.Line
                                    title="Sub Total:"
                                    valueKey="subTotal"
                                />
                                <Details.Line
                                    title={`Tax (${
                                        _ctx.orderTax ? _ctx.taxPercentage : 0
                                    }%):`}
                                    valueKey="tax"
                                />
                                <Details.Line title="C.C.C:" valueKey="ccc" />
                                <Details.Line
                                    title="Total:"
                                    valueKey="grandTotal"
                                />
                            </TableRow>
                        </TableBody>
                    </Table>
                </div>
            </div>
        </div>
    );
}
function Footer() {
    const _ctx = useContext(ctx);
    return (
        <div className="flex  justify-end">
            <div className="md:max-w-xs" id="dykeFooter">
                <Table className="table-fixed  rounded border">
                    <TableHeader>
                        <TableRow>
                            <TableHead className="" colSpan={2}>
                                Estimate
                            </TableHead>
                            {/* <TableHead colSpan={1}>a</TableHead> */}
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        <TableRow>
                            <Details.PaymentOptions />
                        </TableRow>
                        <TableRow>
                            <Details.Labour />
                        </TableRow>
                        <TableRow>
                            <Details.Discount />
                        </TableRow>
                        <TableRow>
                            <Details.Line
                                title="Sub Total"
                                valueKey="subTotal"
                            />
                        </TableRow>
                        <TaxForm />
                        {/* {salesData2.salesTaxes?.map((line) => (
                            <TableRow key={line.code}>
                                <Details.Line
                                    title={`${line.title} ${line.percentage}%`}
                                    valueKey={line.code as any}
                                />
                            </TableRow>
                        ))} */}
                        {/* <TableRow>
                            <Details.Line
                                title={`Tax (${
                                    _ctx.orderTax ? _ctx.taxPercentage : 0
                                }%)`}
                                valueKey="tax"
                            />
                        </TableRow> */}
                        <TableRow>
                            <Details.Line title="C.C.C" valueKey="ccc" />
                        </TableRow>
                        <TableRow>
                            <Details.Line title="Total" valueKey="grandTotal" />
                        </TableRow>
                    </TableBody>
                </Table>
            </div>
        </div>
    );
}

function TaxForm({}) {
    const { taxForm } = useContext(ctx);
    const modal = useModal();
    const form = useDykeForm();

    const { footerCtx } = useLegacyDykeForm();
    function selectionChanged(e) {
        setSelection((v) => {
            return null as any;
        });
        if (e == "new") {
            modal.openModal(
                <TaxModal
                    onCreate={(tax) => {
                        taxForm.listArray.append(tax);
                        setTimeout(() => {
                            selectionChanged(tax.taxCode);
                        }, 500);
                    }}
                />,
            );
        } else {
            footerCtx.changeTax(e);
            return;
        }
    }
    const [selection, setSelection] = useState();
    useEffect(() => {
        if (selection) setSelection(null);
    }, [selection]);
    if (taxForm.selectionArray.fields.length)
        return (
            <>
                {taxForm.selectionArray.fields.map((s, i) => (
                    <TableRow key={i}>
                        <TableHead>
                            {s.title} {` (${s.percentage}%)`}
                        </TableHead>
                        <TableCell className="w-full">
                            <div className="flex w-full  items-center justify-end space-x-2">
                                <div>
                                    <TaxAmount code={s.taxCode} />
                                </div>
                                <Button
                                    variant="destructive"
                                    onClick={() =>
                                        footerCtx.removeTaxSelection(
                                            s.taxCode,
                                            i,
                                        )
                                    }
                                    className="h-8 w-8"
                                    size="icon"
                                >
                                    <Icons.X />
                                </Button>
                            </div>
                        </TableCell>
                    </TableRow>
                ))}
            </>
        );
    // if(selection)
    return (
        <>
            <TableRow>
                <TableHead className="w-full bg-red-400" colSpan={2}>
                    <div className="flex items-center gap-4">
                        <Label>Select Tax</Label>
                        <Select
                            value={selection}
                            onValueChange={selectionChanged}
                        >
                            <SelectTrigger className="">
                                <SelectValue
                                    className="h-8"
                                    defaultValue={"Select tax"}
                                    placeholder="Select tax"
                                />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem
                                    onClick={(e) => {
                                        e.preventDefault();
                                    }}
                                    value="new"
                                >
                                    Create new
                                </SelectItem>
                                {taxForm?.listArray?.fields?.map((t) => (
                                    <SelectItem key={t._id} value={t.taxCode}>
                                        {t.title}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                </TableHead>
            </TableRow>
        </>
    );
}
function TaxAmount({ code }) {
    const form = useDykeForm();
    const tax = form.watch(`_taxForm.taxCostsByCode.${code}` as any);

    return (
        <>
            <Money value={tax} />
        </>
    );
}
