"use client";

import { InfoLine } from "../../../sales/edit/components/sales-details-section";
import { useDykeCtx, useDykeForm } from "../_hooks/form-context";
import FormSelect from "@/components/common/controls/form-select";
import { useEffect, useState } from "react";
import FormInput from "@/components/common/controls/form-input";
import salesData from "../../../sales/sales-data";
import DateControl from "@/_v2/components/common/date-control";
import FormCheckbox from "@/components/common/controls/form-checkbox";
import salesFormUtils from "@/app/(clean-code)/(sales)/_common/utils/sales-form-utils";
import { useLegacyDykeForm } from "@/app/(clean-code)/(sales)/sales-book/(form)/_hooks/legacy-hooks";

export default function SalesMetaData() {
    const form = useDykeForm();
    const profiles = form.getValues("data.profiles");
    const ctx = useDykeCtx();
    const salesProfileId = form.watch("order.customerProfileId");
    const mainCtx = useLegacyDykeForm();
    useEffect(() => {
        salesFormUtils.salesProfileChanged(form, salesProfileId);
        const prof = profiles?.find((p) => salesProfileId == p.id);
        const taxCode = prof?.meta?.taxCode;
        // console.log({ taxCode });
        mainCtx.footerCtx.changeTax(taxCode);
    }, [salesProfileId]);
    const type = form.getValues("order.type");
    return (
        <div className="xl:col-span-3 grid gap-2 xl:grid-cols-2 xl:gap-x-4">
            <InfoLine label="Sales Rep:">
                <span>{form.getValues("salesRep.name")}</span>
            </InfoLine>
            <InfoLine label="Profile">
                <FormSelect
                    control={form.control}
                    size="sm"
                    className="min-w-[150px]"
                    name="order.customerProfileId"
                    titleKey="title"
                    valueKey="id"
                    options={[...profiles]}
                />
            </InfoLine>
            <InfoLine label="Q.B Order #">
                <FormInput
                    size="sm"
                    control={form.control}
                    name="order.meta.qb"
                />
            </InfoLine>
            <InfoLine label="Delivery">
                <FormSelect
                    size="sm"
                    control={form.control}
                    className="min-w-[150px]"
                    name="order.deliveryOption"
                    options={salesData.delivery}
                />
            </InfoLine>
            <InfoLine label="Mockup %">
                <FormInput
                    control={form.control}
                    type="number"
                    size="sm"
                    name="order.meta.mockupPercentage"
                />
            </InfoLine>
            {type == "order" ? (
                <>
                    <InfoLine label="Payment Term">
                        <FormSelect
                            control={form.control}
                            size="sm"
                            className="min-w-[150px]"
                            name="order.paymentTerm"
                            options={salesData.paymentTerms}
                        />
                    </InfoLine>
                    <InfoLine label="P.O No.">
                        <FormInput
                            control={form.control}
                            size="sm"
                            name="order.meta.po"
                        />
                    </InfoLine>
                </>
            ) : (
                <InfoLine label="Good Until">
                    <DateControl
                        className="h-8 min-w-[150px]"
                        name="order.goodUntil"
                    />
                </InfoLine>
            )}
            {/* <div className="grid grid-cols-2 gap-2 items-center xl:col-span-2"> */}
            {/* <InfoLine label="Tax">
                <FormCheckbox
                    switchInput
                    control={form.control}
                    className="h-8"
                    name="order.meta.tax"
                />
            </InfoLine> */}

            {/* <InfoLine label="Component Price">
                <FormCheckbox
                    switchInput
                    className="h-8"
                    name="order.meta.calculatedPriceMode"
                />
            </InfoLine> */}
            {ctx.superAdmin && (
                <InfoLine label="Price Admin">
                    <FormCheckbox
                        switchInput
                        control={form.control}
                        className="h-8"
                        name="adminMode"
                    />
                </InfoLine>
            )}
            {/* </div> */}
        </div>
    );
}
