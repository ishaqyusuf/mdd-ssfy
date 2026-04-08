import { Fragment, useMemo } from "react";
import salesData from "@/app-deps/(clean-code)/(sales)/_common/utils/sales-data";
import { useFormDataStore } from "@/app-deps/(clean-code)/(sales)/sales-book/(form)/_common/_stores/form-data-store";
import { SettingsClass } from "@/app-deps/(clean-code)/(sales)/sales-book/(form)/_utils/helpers/zus/settings-class";
import { DatePicker } from "@/components/_v1/date-range-picker";
import { Icons } from "@/components/_v1/icons";
import { Menu } from "@gnd/ui/custom/menu";
import { AnimatedNumber } from "@/components/animated-number";
import { FormSelectProps } from "@/components/common/controls/form-select";
import { NumberInput } from "@/components/currency-input";
import { LabelInput } from "@/components/label-input";
import { cn } from "@/lib/utils";
import { NumericFormatProps } from "react-number-format";

import { Label } from "@gnd/ui/label";
import { ScrollArea } from "@gnd/ui/scroll-area";
import {
    Select as BaseSelect,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@gnd/ui/select";
import ConfirmBtn from "@/components/confirm-button";
import { deleteSalesExtraCost } from "@/actions/delete-sales-extra-cost";
import { SalesHistory } from "@/components/sales-hx";
import { SalesCustomerInput } from "./sales-customer-input";

export type SalesMetaTab = "summary" | "history";

export function SalesMetaForm({ tab = "summary" }: { tab?: SalesMetaTab }) {
    const zus = useFormDataStore();
    const md = zus.metaData;

    return (
        <div>{tab === "summary" ? <SummaryTab /> : <SalesHistory salesId={md?.salesId} />}</div>
    );
}
function SummaryTab({}) {
    const zus = useFormDataStore();
    const md = zus.metaData;
    const setting = useMemo(() => new SettingsClass(), []);
    const profiles = setting.salesProfiles();
    const taxList = setting.taxList();
    const displaySubTotal =
        (md.pricing?.grandTotal || 0) -
        (md.pricing?.taxValue || 0) -
        (md.pricing?.ccc || 0);
    function calculateTotal() {
        setting.calculateTotalPrice();
    }
    return (
        <div className="">
            <SalesCustomerInput />
            {/* <div className="min-h-[15vh] border-b">
                <CustomerDataSection />
            </div> */}
            <div className="space-y-2">
                <div className="grid grid-cols-1 gap-1.5 md:grid-cols-2 xl:grid-cols-3">
                    <CompactField label="Date">
                        <DatePicker
                            className="midday h-8 w-auto border-none p-0 px-1 uppercase whitespace-nowrap"
                            hideIcon
                            value={md.createdAt as any}
                            setValue={(e) => {
                                zus.dotUpdate("metaData.createdAt", e);
                            }}
                        />
                    </CompactField>
                    <CompactField label="Profile">
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
                    </CompactField>
                    <CompactField label="P.O No">
                        <LabelInput
                            className="midday w-full text-right uppercase"
                            value={md.po || ""}
                            onChange={(e) => {
                                zus.dotUpdate("metaData.po", e.target.value);
                            }}
                        />
                    </CompactField>
                    {md.type === "order" ? (
                        <>
                            <CompactField label="Net Term">
                                <Select
                                    name="metaData.paymentTerm"
                                    value={md.paymentTerm}
                                    options={salesData.paymentTerms}
                                    valueKey={"value"}
                                    titleKey={"text"}
                                />
                            </CompactField>
                            {md.paymentTerm != "None" || (
                                <CompactField label="Due Date">
                                    <DatePicker
                                        className="midday h-8 w-auto border-none p-0 px-1 uppercase whitespace-nowrap"
                                        hideIcon
                                        value={md.paymentDueDate as any}
                                        setValue={(e) => {
                                            zus.dotUpdate(
                                                "metaData.paymentDueDate",
                                                e,
                                            );
                                        }}
                                    />
                                </CompactField>
                            )}
                            <CompactField label="Production Due Date">
                                <DatePicker
                                    className="midday h-8 w-auto border-none p-0 px-1 uppercase whitespace-nowrap"
                                    hideIcon
                                    value={md.prodDueDate}
                                    setValue={(e) => {
                                        zus.dotUpdate(
                                            "metaData.prodDueDate",
                                            e,
                                        );
                                    }}
                                />
                            </CompactField>
                        </>
                    ) : (
                        <CompactField label="Good Until">
                            <DatePicker
                                className="midday h-8 w-auto border-none p-0 px-1 uppercase whitespace-nowrap"
                                hideIcon
                                value={md.goodUntil as any}
                                setValue={(e) => {
                                    zus.dotUpdate("metaData.goodUntil", e);
                                }}
                            />
                        </CompactField>
                    )}
                    <CompactField
                        label="Delivery Mode"
                        className="md:col-span-2 xl:col-span-3"
                    >
                        <Select
                            name="metaData.deliveryMode"
                            value={md.deliveryMode}
                            options={salesData.deliveryModes}
                            valueKey={"value"}
                            titleKey={"text"}
                        />
                    </CompactField>
                </div>
                <div className="mt-1.5 space-y-1 rounded-lg border border-muted bg-muted/10 p-2.5">
                    <div className="mb-2 border-b pb-2 text-right text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                        Cost Summary
                    </div>
                    {
                        // Object.entries(md.extraCosts)
                        md.extraCosts
                            .map((k, i) =>
                                k.type == "Labor" ? (
                                    <Fragment key={i}></Fragment>
                                ) : (
                                    <Input
                                        key={i}
                                        onChange={(e) => {
                                            calculateTotal();
                                        }}
                                        label={
                                            <span>
                                                <LabelInput
                                                    value={k.label}
                                                    className="text-end"
                                                    onChange={(e) => {
                                                        zus.dotUpdate(
                                                            `metaData.extraCosts.${i}.label`,
                                                            e.target.value,
                                                        );
                                                    }}
                                                />
                                            </span>
                                        }
                                        name={`metaData.extraCosts.${i}.amount`}
                                        value={md.extraCosts?.[i]?.amount || ""}
                                        numberProps={{
                                            prefix: "$",
                                        }}
                                    >
                                        <ConfirmBtn
                                            onClick={async (e) => {
                                                if (k.id)
                                                    await deleteSalesExtraCost(
                                                        k.id,
                                                    );

                                                zus.removeKey(
                                                    `metaData.extraCosts.${i}`,
                                                );
                                                calculateTotal();
                                            }}
                                            size="sm"
                                            trash
                                        />
                                    </Input>
                                ),
                            )
                    }
                    <Menu Icon={Icons.Add} label={"Add Cost"}>
                        {[
                            {
                                label: "Discount",
                                type: "Discount",
                            },
                            {
                                label: "Delivery",
                                type: "Delivery",
                            },
                            {
                                label: "Flat Labor Cost",
                                type: "FlatLabor",
                            },
                            {
                                label: "Custom",
                                type: "CustomNonTaxxable",
                            },
                        ].map((item, i) => (
                            <Menu.Item
                                onClick={(e) => {
                                    zus.dotUpdate(`metaData.extraCosts`, [
                                        ...zus.metaData?.extraCosts,
                                        {
                                            label: item.label,
                                            amount: 0,
                                            type: item.type,
                                        },
                                    ]);
                                    calculateTotal();
                                }}
                                key={i}
                            >
                                {item.label}
                            </Menu.Item>
                        ))}
                    </Menu>
                    <LineContainer label="Sub Total">
                        <div className="text-right">
                            <AnimatedNumber value={displaySubTotal || 0} />
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
                                        <span className="text-sm">
                                            ({md.pricing?.cccPercentage || 3.5}%)
                                        </span>
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
                </div>
            </div>
        </div>
    );
}
function CompactField({ label, className = "", children }) {
    return (
        <div className={cn("px-0.5 py-0.5", className)}>
            <Label className="text-sm leading-none uppercase tracking-wide text-muted-foreground">
                {label}
            </Label>
            <div className="mt-0.5 flex min-h-6 items-center justify-end">
                {children}
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
    children?;
}
function Input({
    value,
    label,
    name,
    lg,
    onChange,
    children,
    ...props
}: InputProps) {
    const zus = useFormDataStore();
    return (
        <LineContainer lg={lg} label={label}>
            {props.type == "date" ? (
                <>
                    <DatePicker
                        className=" midday w-auto border-b border-none p-0 px-1 uppercase whitespace-nowrap"
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
                    className="text-end min-w-16"
                    value={value as any}
                    readOnly={props.readOnly}
                    onValueChange={(e) => {
                        const val = e.floatValue || "";
                        zus.dotUpdate(name, val);
                        onChange?.(val);
                    }}
                />
            ) : (
                <LabelInput
                    className="midday h-6 text-sm uppercase"
                    value={value as any}
                    onChange={(e) => {
                        zus.dotUpdate(name, e.target.value);
                    }}
                />
            )}
            {children}
        </LineContainer>
    );
}
function LineContainer({ label, lg = false, className = "", children }) {
    return (
        <div
            className={cn(
                "items-center gap-4 font-mono$ uppercase",
                label && "grid grid-cols-5",
            )}
        >
            <div className="col-span-3 flex justify-end text-muted-foreground">
                {!label ||
                    (typeof label === "string" ? (
                        <Label className="">{label}:</Label>
                    ) : (
                        label
                    ))}
            </div>
            <div className={cn(lg && "col-span-2", "flex flex-1")}>
                {children}
            </div>
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
                className="uppercases midday relative h-6 w-auto min-w-[16px] border-none bg-transparent p-0 text-sm font-mono$"
            >
                {isPlaceholder && (
                    <div className="pointer-events-none absolute inset-0">
                        <div className="h-full w-full bg-[repeating-linear-gradient(-60deg,#DBDBDB,#DBDBDB_1px,transparent_1px,transparent_5px)] dark:bg-[repeating-linear-gradient(-60deg,#2C2C2C,#2C2C2C_1px,transparent_1px,transparent_5px)]" />
                    </div>
                )}

                <SelectValue
                    // className="whitespace-nowrap border-none p-0 font-mono$ uppercase"
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
