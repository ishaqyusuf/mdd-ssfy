"use client";

import { useEffect, useTransition } from "react";
import { SalesFormResponse } from "@/app/(v1)/(loggedIn)/sales/_actions/sales-form";
import { DatePicker } from "@/components/_v1/date-range-picker";
import { formatDate } from "@/lib/use-day";
import { useAppSelector } from "@/store";
import { ISalesOrderForm } from "@/types/sales";

import { FormField } from "@gnd/ui/form";
import { Input } from "@gnd/ui/input";
import { Label } from "@gnd/ui/label";
import {
    Select,
    SelectContent,
    SelectGroup,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@gnd/ui/select";
import { Switch } from "@gnd/ui/switch";

import salesUtils from "../sales-utils";
import { SalesCustomerProfileInput } from "./customer-profile-input";

export default function InfoCard({
    form,
    data,
}: {
    form: ISalesOrderForm;
    data: SalesFormResponse;
}) {
    const watchPaymentTerm = form.getValues("paymentTerm");
    const watchType = form.getValues("type");
    const watchGoodUntil = form.getValues("goodUntil");
    const watchCreatedAt = form.getValues("createdAt");
    const watchDelivery = form.getValues("deliveryOption");

    const [resetting, startTransition] = useTransition();

    useEffect(() => {
        // console.log("....");
        if (watchType == "order")
            salesUtils.calculatePaymentTerm(
                form,
                watchPaymentTerm,
                watchCreatedAt,
            );
    }, [watchPaymentTerm, watchType, watchCreatedAt]);
    // function resetTerm() {
    //   startTransition(async () => {
    //     const ts = watchPaymentTerm?.replace("Net", "");
    //     const term = Number(ts);
    //     if (term) {
    //       const goodUntil = new Date(
    //         dayjs()
    //           .add(term, "D")
    //           .toISOString()
    //       );
    //       console.log(watchPaymentTerm, goodUntil);
    //       await updatePaymentTerm(
    //         form.getValues("id"),
    //         watchPaymentTerm,
    //         goodUntil
    //       );
    //       form.setValue("goodUntil", goodUntil);

    //       toast.success("Payment term reset successfully");
    //     } else toast.error("set a valid payment terms");
    //   });
    // }
    const mockupMode = useAppSelector(
        (state) => state.orderItemComponent?.showMockup,
    );
    return (
        <div className="hover:bg-slate-100s hover:shadows  group relative  h-full w-full rounded border border-slate-300 p-2 text-start">
            <div className="grid gap-2 xl:grid-cols-2 xl:gap-x-4">
                <InfoLine label="Sales Rep">
                    <span>
                        {
                            // form.getValues("meta.rep")
                            data.form.salesRep?.name
                        }
                    </span>
                </InfoLine>
                <InfoLine label="Profile">
                    <SalesCustomerProfileInput
                        form={form}
                        profiles={data?.ctx?.profiles}
                    />
                </InfoLine>
                <InfoLine label="Q.B Order #">
                    <Input
                        className="h-6 w-[100px] uppercase"
                        {...form.register("meta.qb")}
                    />
                </InfoLine>

                {/* <InfoLine label="P.O No.">
          <Input
            className="h-6 w-[100px] uppercase"
            {...form.register("meta.po")}
          />
        </InfoLine> */}
                {watchType == "order" && (
                    <>
                        <InfoLine label="Delivery Option">
                            <div className="flex">
                                <FormField
                                    control={form.control}
                                    name="deliveryOption"
                                    render={({ field }) => (
                                        <Select
                                            value={`${field.value}`}
                                            onValueChange={field.onChange}
                                        >
                                            <SelectTrigger className="h-6   w-auto min-w-[100px]">
                                                <SelectValue placeholder="Delivery" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectGroup>
                                                    <SelectItem value="pickup">
                                                        Pickup
                                                    </SelectItem>
                                                    <SelectItem value="delivery">
                                                        Delivery
                                                    </SelectItem>
                                                </SelectGroup>
                                            </SelectContent>
                                        </Select>
                                    )}
                                />
                            </div>
                        </InfoLine>
                    </>
                )}

                <InfoLine label="Mockup %">
                    <Input
                        disabled={mockupMode}
                        className="h-6 w-[100px] uppercase"
                        {...form.register("meta.mockupPercentage")}
                    />
                </InfoLine>
                <InfoLine label="Profile Estimate">
                    <FormField
                        control={form.control}
                        name="meta.profileEstimate"
                        render={({ field }) => (
                            <Switch
                                checked={field.value as any}
                                onCheckedChange={field.onChange}
                            />
                        )}
                    />
                </InfoLine>
                {watchType == "order" && (
                    <>
                        <InfoLine label="Payment Terms">
                            <div className="flex flex-col">
                                <FormField
                                    control={form.control}
                                    name="paymentTerm"
                                    render={({ field }) => (
                                        <Select
                                            value={`${field.value}`}
                                            onValueChange={(v) => {
                                                field.onChange(v);
                                                console.log(v);
                                            }}
                                        >
                                            <SelectTrigger className="h-6   w-auto min-w-[100px]">
                                                <SelectValue placeholder="Select Term" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectGroup>
                                                    <SelectItem value="Net10">
                                                        Net10
                                                    </SelectItem>
                                                    <SelectItem value="Net20">
                                                        Net20
                                                    </SelectItem>
                                                    <SelectItem value="Net30">
                                                        Net30
                                                    </SelectItem>
                                                </SelectGroup>
                                            </SelectContent>
                                        </Select>
                                    )}
                                />

                                <div className="inline-flex items-center text-xs font-medium text-red-500">
                                    {watchGoodUntil && (
                                        <>
                                            <span>{`${formatDate(
                                                watchGoodUntil,
                                                "MMM DD",
                                            )}`}</span>
                                            {/* <TooltipProvider>
                                                <Tooltip>
                                                    <TooltipTrigger
                                                        onClick={resetTerm}
                                                    >
                                                        <span>{`${formatDate(
                                                            watchGoodUntil,
                                                            "MMM DD"
                                                        )}`}</span>
                                                    </TooltipTrigger>
                                                    <TooltipContent>
                                                        <p>
                                                            Click to reset
                                                            payment term
                                                        </p>
                                                    </TooltipContent>
                                                </Tooltip>
                                            </TooltipProvider> */}
                                        </>
                                    )}
                                </div>
                            </div>
                        </InfoLine>
                    </>
                )}
                {watchType == "quote" && (
                    <InfoLine label="Good Until">
                        <DatePicker
                            value={watchGoodUntil}
                            setValue={(v) => form.setValue("goodUntil", v)}
                            className="h-8 w-[150px]"
                        />
                        {/* <Select
              value={watchPaymentTerm as any}
              onValueChange={(e) => form.setValue("paymentTerm", e)}
            >
              <SelectTrigger className="h-6 w-[100px]">
                <SelectValue placeholder="" />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  <SelectItem value="Net10">Net10</SelectItem>
                  <SelectItem value="Net20">Net20</SelectItem>
                  <SelectItem value="Net30">Net30</SelectItem>
                </SelectGroup>
              </SelectContent>
            </Select> */}
                    </InfoLine>
                )}
            </div>
        </div>
    );
}
function InfoLine({ label, children }) {
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
