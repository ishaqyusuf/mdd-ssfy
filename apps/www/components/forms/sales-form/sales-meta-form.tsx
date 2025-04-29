import { useMemo, useState } from "react";
import { openSalesOverview } from "@/app/(clean-code)/(sales)/_common/_components/sales-overview-sheet.bin";
import salesData from "@/app/(clean-code)/(sales)/_common/utils/sales-data";
import { useFormDataStore } from "@/app/(clean-code)/(sales)/sales-book/(form)/_common/_stores/form-data-store";
import { SettingsClass } from "@/app/(clean-code)/(sales)/sales-book/(form)/_utils/helpers/zus/settings-class";
import { DatePicker } from "@/components/_v1/date-range-picker";
import { Icons } from "@/components/_v1/icons";
import { Menu } from "@/components/(clean-code)/menu";
import { AnimatedNumber } from "@/components/animated-number";
import { FormSelectProps } from "@/components/common/controls/form-select";
import { NumberInput } from "@/components/currency-input";
import { LabelInput } from "@/components/label-input";
import { cn } from "@/lib/utils";
import { NumericFormatProps } from "react-number-format";

import { Button } from "@gnd/ui/button";
import { Label } from "@gnd/ui/label";
import { ScrollArea } from "@gnd/ui/scroll-area";
import {
    Select as BaseSelect,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@gnd/ui/select";

import { TakeOffForm } from "../take-off-form/take-off-form";
import { CustomerDataSection } from "./customer-data-section";
import { Footer } from "./footer";
import { SalesFormEmailMenu } from "./sales-form-email-menu";
import { SalesFormPrintMenu } from "./sales-form-print-menu";
import { SalesFormSave } from "./sales-form-save";

export function SalesMetaForm({}) {
    const zus = useFormDataStore();
    const md = zus.metaData;
    const tabs = [
        "summary",
        "take off",
        // "transactions",
        // "customer info",
        // , "customer"
    ];
    const [tab, setTab] = useState(md?.id ? "summary" : "summary");
    return (
        <div className="">
            <div className="flex border-b">
                {tabs.map((_tab, ti) => (
                    <Button
                        key={_tab}
                        variant="ghost"
                        // disabled={ti != 0}
                        onClick={(e) => {
                            setTab(_tab);
                        }}
                        className={cn(
                            "rounded-none border-b-2 border-transparent font-mono uppercase hover:bg-transparent",
                            tab == _tab
                                ? "rounded-none border-b border-primary"
                                : "text-muted-foreground/90 hover:text-muted-foreground",
                        )}
                    >
                        {_tab}
                    </Button>
                ))}
                <div className="flex-1"></div>
                <div>
                    <Menu>
                        {/* <Menu.Item Icon={Icons.save}>Save</Menu.Item> */}
                        <SalesFormSave type="menu" />
                        <Menu.Item
                            onClick={() => {
                                openSalesOverview({
                                    salesId: zus.metaData.id,
                                });
                            }}
                            Icon={Icons.customerService}
                        >
                            Overview
                        </Menu.Item>
                        <SalesFormPrintMenu />
                        <SalesFormEmailMenu />
                        <Menu.Item Icon={Icons.copy}>Copy</Menu.Item>
                        <Menu.Item Icon={Icons.move2}>Move to</Menu.Item>
                        <Menu.Item Icon={Icons.settings}>Settings</Menu.Item>
                    </Menu>
                </div>
            </div>
            {tab == "summary" ? (
                <SummaryTab />
            ) : tab == "take off" ? (
                <TakeOffForm salesId={md?.id} />
            ) : (
                <></>
            )}
        </div>
    );
}
function SummaryTab({}) {
    const zus = useFormDataStore();
    const md = zus.metaData;
    const setting = useMemo(() => new SettingsClass(), []);
    const profiles = setting.salesProfiles();
    const taxList = setting.taxList();
    function calculateTotal() {
        setting.calculateTotalPrice();
    }
    return (
        <div className="">
            <div className="min-h-[20vh] border-b">
                <CustomerDataSection />
            </div>
            <div className="grid gap-1">
                <Input
                    label="Date"
                    name="metaData.createdAt"
                    value={md.createdAt}
                    type="date"
                />
                <LineContainer lg label="Profile">
                    <Select
                        value={md.salesProfileId}
                        onSelect={(e) => {
                            setting.salesProfileChanged();
                        }}
                        name="metaData.salesProfileId"
                        options={profiles}
                        titleKey="title"
                        valueKey="id"
                    />
                </LineContainer>
                <Input label="P.O No" name="metaData.po" value={md.po} />

                <LineContainer label="Net Term">
                    <Select
                        name="metaData.paymentTerm"
                        value={md.paymentTerm}
                        options={salesData.paymentTerms}
                        valueKey={"value"}
                        titleKey={"text"}
                    />
                </LineContainer>
                <div className="py-5"></div>
                <LineContainer label="Delivery Mode">
                    <Select
                        name="metaData.deliveryMode"
                        value={md.deliveryMode}
                        options={salesData.deliveryModes}
                        valueKey={"value"}
                        titleKey={"text"}
                    />
                </LineContainer>

                <LineContainer label="Sub Total">
                    <div className="text-right">
                        <AnimatedNumber value={md.pricing?.subTotal || 0} />
                    </div>
                </LineContainer>
                <LineContainer
                    label={
                        <div className="col-span-3 flex items-center justify-end border-b hover:bg-muted-foreground/30">
                            <Select
                                name="metaData.tax.taxCode"
                                options={taxList}
                                value={md.tax?.taxCode}
                                titleKey="title"
                                valueKey="taxCode"
                                onSelect={(e) => {
                                    setting.taxCodeChanged();
                                }}
                                className="w-auto"
                            />
                            <span className="text-sm">
                                {!md.tax?.taxCode || (
                                    <span>({md.tax?.percentage || 0}%)</span>
                                )}
                                :
                            </span>
                        </div>
                    }
                >
                    <div className="text-right">
                        <AnimatedNumber value={md.pricing?.taxValue || 0} />
                    </div>
                </LineContainer>
                <LineContainer
                    label={
                        <div className="col-span-3 flex items-center justify-end border-b hover:bg-muted-foreground/30">
                            <Select
                                name="metaData.paymentMethod"
                                options={salesData.paymentOptions}
                                value={md.paymentMethod}
                                placeholder="Select Payment Method"
                                onSelect={(e) => {
                                    setting.taxCodeChanged();
                                }}
                                className="w-auto"
                            />
                            <span>
                                {md.paymentMethod != "Credit Card" || (
                                    <span className="text-sm">(3%)</span>
                                )}
                                :
                            </span>
                        </div>
                    }
                >
                    <div className="text-right">
                        <AnimatedNumber value={md.pricing?.ccc || 0} />
                    </div>
                </LineContainer>
                <Input
                    label="Labor Cost ($)"
                    name="metaData.pricing.labour"
                    value={md.pricing?.labour}
                    numberProps={{ prefix: "$" }}
                    onChange={calculateTotal}
                />
                <Input
                    label="Delivery Cost ($)"
                    name="metaData.pricing.delivery"
                    value={md.pricing?.delivery}
                    numberProps={{ prefix: "$" }}
                    onChange={calculateTotal}
                />
                <Input
                    label="Sales Discount ($)"
                    name="metaData.pricing.discount"
                    value={md.pricing?.discount}
                    numberProps={{ prefix: "$" }}
                    onChange={calculateTotal}
                />
                <LineContainer label="Total">
                    <div className="text-right">
                        <AnimatedNumber value={md.pricing?.grandTotal || 0} />
                    </div>
                </LineContainer>
                <Footer />
            </div>
        </div>
    );
}
interface InputProps {
    value;
    label?;
    name?;
    type?: "date";
    numberProps?: NumericFormatProps;
    lg?: boolean;
    readOnly?: boolean;
    onChange?;
}
function Input({ value, label, name, lg, onChange, ...props }: InputProps) {
    const zus = useFormDataStore();
    return (
        <LineContainer lg={lg} label={label}>
            {props.type == "date" ? (
                <>
                    <DatePicker
                        className=" midday w-auto border-b border-none p-0 uppercase"
                        hideIcon
                        value={value as any}
                        setValue={(e) => {
                            zus.dotUpdate(name, e);
                            onChange?.(e);
                        }}
                    />
                </>
            ) : props.numberProps ? (
                <NumberInput
                    {...props.numberProps}
                    className="text-end"
                    value={value as any}
                    readOnly={props.readOnly}
                    onValueChange={(e) => {
                        const val = e.floatValue || null;
                        zus.dotUpdate(name, val);
                        onChange?.(val);
                    }}
                />
            ) : (
                <LabelInput
                    className=" midday uppercase"
                    value={value as any}
                    onChange={(e) => {
                        zus.dotUpdate(name, e.target.value);
                    }}
                />
            )}
        </LineContainer>
    );
}
function LineContainer({ label, lg = false, className = "", children }) {
    return (
        <div
            className={cn(
                "items-center gap-4 font-mono uppercase",
                label && "grid grid-cols-5",
            )}
        >
            <div className="col-span-3 flex justify-end text-black/70">
                {!label ||
                    (typeof label === "string" ? (
                        <Label className="">{label}:</Label>
                    ) : (
                        label
                    ))}
            </div>
            <div className={cn(lg && "col-span-2")}>{children}</div>
        </div>
    );
}
export function Select<T>({
    name,
    options,
    valueKey,
    titleKey,
    Item,
    SelectItem: SelItem,
    value,
    ...props
}: FormSelectProps<T> & { value; name }) {
    const state = useFormDataStore();
    function itemValue(option) {
        if (!option) return option;
        if (Number.isInteger(option)) option = String(option);

        return typeof option == "object" ? option[valueKey] : option;
    }
    function itemText(option) {
        if (!option) return option;
        return typeof option == "string"
            ? option
            : titleKey == "label"
              ? option[titleKey] || option["text"]
              : option[titleKey];
    }
    const isPlaceholder = !value && !props.placeholder;
    return (
        <BaseSelect
            onValueChange={(e) => {
                state.dotUpdate(name, e);
                props.onSelect?.(e as any);
            }}
            value={value}
        >
            <SelectTrigger
                noIcon
                className="uppercases midday relative  h-7 w-auto min-w-[16px] border-none bg-transparent p-0 font-mono"
            >
                {isPlaceholder && (
                    <div className="pointer-events-none absolute inset-0">
                        <div className="h-full w-full bg-[repeating-linear-gradient(-60deg,#DBDBDB,#DBDBDB_1px,transparent_1px,transparent_5px)] dark:bg-[repeating-linear-gradient(-60deg,#2C2C2C,#2C2C2C_1px,transparent_1px,transparent_5px)]" />
                    </div>
                )}

                <SelectValue
                    asChild
                    className="whitespace-nowrap border-none p-0 font-mono uppercase"
                    placeholder={props.placeholder}
                >
                    <span>
                        {itemText(options?.find((o) => itemValue(o) == value))}
                    </span>
                </SelectValue>
            </SelectTrigger>

            <SelectContent className="">
                <ScrollArea className="max-h-[40vh] overflow-auto">
                    {options?.map((option, index) =>
                        SelItem ? (
                            <SelItem option={option} key={index} />
                        ) : (
                            <SelectItem key={index} value={itemValue(option)}>
                                {Item ? (
                                    <Item option={option} />
                                ) : (
                                    <>{itemText(option)}</>
                                )}
                            </SelectItem>
                        ),
                    )}
                </ScrollArea>
            </SelectContent>
        </BaseSelect>
    );
}
