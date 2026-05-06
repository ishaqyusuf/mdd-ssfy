import { Fragment, type ReactNode, useEffect, useMemo, useState } from "react";
import { useFormDataStore } from "@/app-deps/(clean-code)/(sales)/sales-book/(form)/_common/_stores/form-data-store";
import { SettingsClass } from "@/app-deps/(clean-code)/(sales)/sales-book/(form)/_utils/helpers/zus/settings-class";
import { updateSalesMetaAction } from "@/actions/update-sales-meta-action";
import { DatePicker } from "@/components/_v1/date-range-picker";
import { Icons } from "@gnd/ui/icons";
import { Menu } from "@gnd/ui/custom/menu";
import { Button } from "@gnd/ui/button";
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
import salesData from "@sales/sales-data";
import { PaymentMethodReviewDialog } from "./payment-method-review-dialog";

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
    const [paymentReviewOpen, setPaymentReviewOpen] = useState(false);
    const [paymentReviewSeen, setPaymentReviewSeen] = useState(false);
    const profiles = setting.salesProfiles();
    const taxList = setting.taxList();
    const displaySubTotal =
        (md.pricing?.grandTotal || 0) -
        (md.pricing?.taxValue || 0) -
        (md.pricing?.ccc || 0);
    const isOrder = md?.type === "order";
    const shouldReviewPaymentMethod =
        isOrder &&
        Boolean(md?.id) &&
        !paymentReviewSeen &&
        !md?.paymentMethodReviewDismissed &&
        Number(md?.pricing?.paid || 0) <= 0 &&
        (!md?.paymentMethod || md.paymentMethod !== "Credit Card");

    useEffect(() => {
        if (shouldReviewPaymentMethod) setPaymentReviewOpen(true);
    }, [shouldReviewPaymentMethod]);

    async function dismissPaymentMethodReview(checked: boolean) {
        if (!checked || !md?.id) return;
        zus.dotUpdate("metaData.paymentMethodReviewDismissed", true);
        await updateSalesMetaAction(md.id, {
            paymentMethodReviewDismissed: true,
        });
        setPaymentReviewSeen(true);
        setPaymentReviewOpen(false);
    }

    function calculateTotal() {
        setting.calculateTotalPrice();
    }
    return (
        <div className="space-y-4 pb-4">
            <PaymentMethodReviewDialog
                open={isOrder && paymentReviewOpen}
                paymentMethod={md?.paymentMethod}
                paymentMethods={salesData.paymentOptions}
                onOpenChange={(open) => {
                    setPaymentReviewOpen(open);
                    if (!open) setPaymentReviewSeen(true);
                }}
                onSelectPaymentMethod={(method) => {
                    zus.dotUpdate("metaData.paymentMethod", method);
                    setting.taxCodeChanged();
                    setPaymentReviewSeen(true);
                    setPaymentReviewOpen(false);
                }}
                onDontAskAgainChange={dismissPaymentMethodReview}
            />
            <SalesCustomerInput />
            <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                <div className="border-b border-slate-200 bg-slate-50/80 px-4 py-3">
                    <div className="flex items-center gap-2">
                        <div className="rounded-full bg-slate-900 p-1.5 text-white">
                            <Icons.Calendar className="size-3.5" />
                        </div>
                        <div>
                            <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500">
                                Invoice Details
                            </p>
                            <p className="text-sm font-semibold text-slate-900">
                                Dates, terms, profile, and delivery setup
                            </p>
                        </div>
                    </div>
                </div>
                <div className="grid grid-cols-1 gap-3 p-4 md:grid-cols-2">
                    <CompactField label="Date" icon={<Icons.Calendar className="size-4" />}>
                        <DatePicker
                            className="midday h-10 w-full border-none bg-transparent p-0 text-sm font-semibold uppercase whitespace-nowrap"
                            hideIcon
                            value={md.createdAt as any}
                            setValue={(e) => {
                                zus.dotUpdate("metaData.createdAt", e);
                            }}
                        />
                    </CompactField>
                    <CompactField label="Profile" icon={<Icons.Tag className="size-4" />}>
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
                    <CompactField label="P.O No" icon={<Icons.ReceiptText className="size-4" />}>
                        <LabelInput
                            className="midday h-10 w-full bg-transparent text-sm font-semibold uppercase"
                            value={md.po || ""}
                            onChange={(e) => {
                                zus.dotUpdate("metaData.po", e.target.value);
                            }}
                        />
                    </CompactField>
                    {md.type === "order" ? (
                        <>
                            <CompactField label="Net Term" icon={<Icons.CreditCard className="size-4" />}>
                                <Select
                                    name="metaData.paymentTerm"
                                    value={md.paymentTerm}
                                    options={salesData.paymentTerms}
                                    valueKey={"value"}
                                    titleKey={"text"}
                                />
                            </CompactField>
                            <CompactField label="Due Date" icon={<Icons.CalendarDays className="size-4" />}>
                                <DatePicker
                                    className="midday h-10 w-full border-none bg-transparent p-0 text-sm font-semibold uppercase whitespace-nowrap"
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
                            <CompactField
                                label="Production Due Date"
                                icon={<Icons.Hammer className="size-4" />}
                            >
                                <DatePicker
                                    className="midday h-10 w-full border-none bg-transparent p-0 text-sm font-semibold uppercase whitespace-nowrap"
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
                        <CompactField label="Good Until" icon={<Icons.CalendarDays className="size-4" />}>
                            <DatePicker
                                className="midday h-10 w-full border-none bg-transparent p-0 text-sm font-semibold uppercase whitespace-nowrap"
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
                        icon={<Icons.Truck className="size-4" />}
                        className="md:col-span-2"
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
            </section>

            <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                <div className="border-b border-slate-200 bg-slate-50/80 px-4 py-3">
                    <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-2">
                            <div className="rounded-full bg-emerald-600 p-1.5 text-white">
                                <Icons.Calculator className="size-3.5" />
                            </div>
                            <div>
                                <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500">
                                    Cost Summary
                                </p>
                                <p className="text-sm font-semibold text-slate-900">
                                    Adjust global costs, tax, and payment effects
                                </p>
                            </div>
                        </div>
                        <div className="rounded-full border border-slate-200 bg-white px-3 py-1 text-[11px] font-semibold text-slate-600">
                            Invoice-level only
                        </div>
                    </div>
                </div>
                <div className="space-y-3 p-4">
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                        <SummaryStat
                            label="Sub Total"
                            value={<AnimatedNumber value={displaySubTotal || 0} />}
                        />
                        <SummaryStat
                            label="Tax"
                            value={<AnimatedNumber value={md.pricing?.taxValue || 0} />}
                        />
                        <SummaryStat
                            label="CCC"
                            value={<AnimatedNumber value={md.pricing?.ccc || 0} />}
                        />
                    </div>
                    {
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
                                            <span className="flex items-center gap-2">
                                                <LabelInput
                                                    value={k.label}
                                                    className="h-8 bg-transparent text-sm font-semibold text-slate-800"
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
                    <Menu
                        Trigger={
                            <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                className="h-9 rounded-full border-slate-200 bg-slate-50 px-3 text-xs font-semibold text-slate-700 shadow-none hover:bg-slate-100"
                            >
                                <Icons.Plus className="size-3.5" />
                                <span>Add Cost</span>
                                <Icons.ChevronDown className="size-3.5 text-slate-500" />
                            </Button>
                        }
                    >
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
                    <LineContainer
                        label={
                            <span className="text-sm font-medium text-slate-600">
                                Sub Total
                            </span>
                        }
                    >
                        <div className="text-right text-sm font-semibold text-slate-900">
                            <AnimatedNumber value={displaySubTotal || 0} />
                        </div>
                    </LineContainer>
                    <LineContainer
                        label={
                            <div className="flex items-center gap-2">
                                <span className="text-sm font-medium text-slate-600">
                                    Tax Group
                                </span>
                                <Select
                                    name="metaData.tax.taxCode"
                                    options={taxList}
                                    value={md.tax?.taxCode}
                                    titleKey="title"
                                    valueKey="taxCode"
                                    onSelect={(e) => {
                                        setting.taxCodeChanged();
                                    }}
                                    className="w-auto min-w-[110px]"
                                />
                                <span className="text-xs text-slate-500">
                                    {!md.tax?.taxCode || (
                                        <span>({md.tax?.percentage || 0}%)</span>
                                    )}
                                </span>
                            </div>
                        }
                    >
                        <div className="text-right text-sm font-semibold text-slate-900">
                            <AnimatedNumber value={md.pricing?.taxValue || 0} />
                        </div>
                    </LineContainer>
                    <LineContainer
                        label={
                            <div className="flex items-center gap-2">
                                <span className="text-sm font-medium text-slate-600">
                                    Payment Method
                                </span>
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
                                <span className="text-xs text-slate-500">
                                    {md.paymentMethod != "Credit Card" || (
                                        <span>
                                            ({md.pricing?.cccPercentage || 3.5}%)
                                        </span>
                                    )}
                                </span>
                            </div>
                        }
                    >
                        <div className="text-right text-sm font-semibold text-slate-900">
                            <AnimatedNumber value={md.pricing?.ccc || 0} />
                        </div>
                    </LineContainer>
                </div>
            </section>
        </div>
    );
}
function CompactField({ label, icon, className = "", children }) {
    return (
        <div
            className={cn(
                "rounded-2xl border border-slate-200 bg-slate-50/70 p-3 shadow-sm",
                className,
            )}
        >
            <div className="flex items-center gap-2 text-slate-500">
                {icon ? <span className="shrink-0">{icon}</span> : null}
                <Label className="text-[11px] leading-none uppercase tracking-[0.16em] text-slate-500">
                    {label}
                </Label>
            </div>
            <div className="mt-2 flex min-h-10 items-center text-slate-900">
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
                        className="midday h-10 w-full border-none bg-transparent p-0 text-sm font-semibold uppercase whitespace-nowrap"
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
                    className="h-9 min-w-20 bg-transparent text-end text-sm font-semibold"
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
                    className="midday h-9 bg-transparent text-sm font-semibold uppercase"
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
                "rounded-2xl border border-slate-200 bg-slate-50/70 p-3",
                label &&
                    "grid grid-cols-1 gap-3 md:grid-cols-[minmax(0,1fr)_auto]",
                className,
            )}
        >
            <div className="flex items-center text-muted-foreground">
                {!label ||
                    (typeof label === "string" ? (
                        <Label className="text-sm font-medium text-slate-600">
                            {label}
                        </Label>
                    ) : (
                        label
                    ))}
            </div>
            <div
                className={cn(
                    lg && "col-span-2",
                    "flex flex-1 items-center justify-between gap-3 md:justify-end",
                )}
            >
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
                className={cn(
                    "uppercases midday relative h-10 w-full min-w-[16px] border-none bg-transparent p-0 text-left text-sm font-semibold text-slate-900 shadow-none",
                    props.className,
                )}
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

function SummaryStat({
    label,
    value,
}: {
    label: string;
    value: ReactNode;
}) {
    return (
        <div className="rounded-2xl border border-slate-200 bg-slate-50/70 px-3 py-2">
            <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-500">
                {label}
            </p>
            <div className="mt-1 text-sm font-semibold text-slate-900">
                {value}
            </div>
        </div>
    );
}
