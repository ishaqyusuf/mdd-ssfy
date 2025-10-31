import { useContext } from "react";
import DateControl from "@/_v2/components/common/date-control";
import InputControl from "@/_v2/components/common/input-control";
import SelectControl from "@/_v2/components/common/select-control";
import { useFormContext } from "react-hook-form";

import { Label } from "@gnd/ui/label";

import salesData from "../../sales-data";
import { SalesFormContext } from "../ctx";
import { ISalesForm } from "../type";

export default function SalesDetailsSection() {
    const ctx = useContext(SalesFormContext);
    const form = useFormContext<ISalesForm>();

    return (
        <div className="grid gap-2 xl:col-span-3 xl:grid-cols-2 xl:gap-x-4">
            <InfoLine label="Sales Rep:">
                <span>{ctx?.data?.form?.salesRep?.name}</span>
            </InfoLine>
            <InfoLine label="Profile">
                {/* <SelectControl<ISalesForm>
                    name="meta.sales_profile"
                    options={transformOptions(
                        ctx.data.ctx.profiles,
                        "title",
                        "title"
                    )}
                    className="h-8 min-w-[150px]"
                    placeholder="Profile"
                /> */}
            </InfoLine>
            <InfoLine label="Q.B Order #">
                <InputControl<ISalesForm>
                    className="h-8 w-[150px] uppercase"
                    name="meta.qb"
                />
            </InfoLine>

            {ctx.isOrder && (
                <InfoLine label="Delivery Option">
                    <SelectControl<ISalesForm>
                        name="deliveryOption"
                        options={salesData.delivery}
                        className="h-8 min-w-[150px]"
                        placeholder="Profile"
                    />
                </InfoLine>
            )}
            <InfoLine label="Mockup %">
                <InputControl<ISalesForm>
                    className="h-8 w-[150px] uppercase"
                    type="number"
                    name="meta.mockupPercentage"
                />
            </InfoLine>
            <InfoLine label="Profile Estimate">
                <InputControl<ISalesForm>
                    switchInput
                    name="meta.profileEstimate"
                />
            </InfoLine>
            <InfoLine label="P.O No">
                <InputControl<ISalesForm>
                    className="h-8 w-[150px] uppercase"
                    name="meta.po"
                />
            </InfoLine>
            {ctx.isOrder && (
                <>
                    <InfoLine label="Payment Term">
                        <SelectControl<ISalesForm>
                            className="h-8 min-w-[150px]"
                            name="paymentTerm"
                            options={salesData.paymentTerms}
                        />
                    </InfoLine>
                </>
            )}
            {/* Good Until */}
            {!ctx.isOrder && (
                <InfoLine label="Good Until">
                    <DateControl
                        className="h-8 min-w-[150px]"
                        name="goodUntil"
                    />
                </InfoLine>
            )}
        </div>
    );
}
export function InfoLine({ label, children }: { label?; children? }) {
    return (
        <div className="items-center md:grid md:grid-cols-2 xl:grid-cols-3">
            <Label className="whitespace-nowrap text-muted-foreground">
                {label}
            </Label>
            <div className="flex justify-end text-end text-sm xl:col-span-2">
                {children}
            </div>
        </div>
    );
}
