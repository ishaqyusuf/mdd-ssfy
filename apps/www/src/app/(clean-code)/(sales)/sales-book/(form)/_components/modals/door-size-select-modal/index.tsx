import { useState } from "react";
import {
    saveComponentPricingUseCase,
    updateComponentPricingUseCase,
} from "@/app/(clean-code)/(sales)/_common/use-case/sales-book-pricing-use-case";
import Money from "@/components/_v1/money";
import { Menu } from "@/components/(clean-code)/menu";
import FormInput from "@/components/common/controls/form-input";
import FormSelect from "@/components/common/controls/form-select";
import Modal from "@/components/common/modal";
import { _modal } from "@/components/common/modal/provider";
import { cn, toNumber } from "@/lib/utils";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

import { Button } from "@gnd/ui/button";
import {
    CardContent,
    CardDescription,
    CardFooter,
    CardHeader,
    CardTitle,
} from "@gnd/ui/card";
import { Form } from "@gnd/ui/form";
import { Label } from "@gnd/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@gnd/ui/popover";
import { ScrollArea } from "@gnd/ui/scroll-area";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@gnd/ui/table";
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@gnd/ui/tooltip";

import { ComponentHelperClass } from "../../../_utils/helpers/zus/step-component-class";

import { Door } from "../door-swap-modal";

import { AuthGuard } from "@/components/auth-guard";
import { _role } from "@/components/sidebar/links";
import { doorSwings } from "@/utils/constants";
import { DoorSizeSelectProvider, useCtx } from "./use-door-size-select";
import { DoorSupplierBadge } from "@/components/forms/sales-form/door-supplier-badge";

interface Props {
    cls: ComponentHelperClass;
    door?: Door;
}

const pricingOptions = ["Single Pricing", "Multi Pricing"] as const;
type PricingOption = (typeof pricingOptions)[number];

export default function DoorSizeSelectModal({ cls, door }: Props) {
    return (
        <DoorSizeSelectProvider
            args={[
                {
                    cls,
                    door,
                },
            ]}
        >
            <Content />
        </DoorSizeSelectProvider>
    );
}
function Content() {
    const ctx = useCtx();
    const config = ctx.routeConfig;
    const { door } = ctx;
    return (
        <Modal.Content size={config.hasSwing || !config.noHandle ? "lg" : "md"}>
            <Modal.Header
                title={ctx.cls?.getComponent?.title || "Component Price"}
                subtitle={"Select door!!"}
            />
            <div className="flex gap-4">
                <div className="flex-1" />
                <div>
                    <DoorSupplierBadge itemStepUid={ctx.cls.itemStepUid} />
                </div>
            </div>
            <Form {...ctx.form}>
                <ScrollArea
                    // tabIndex={-1}
                    className="-mx-4 max-h-[50vh] px-4"
                >
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Size</TableHead>
                                <TableHead>Price</TableHead>
                                {config.hasSwing && (
                                    <TableHead>Swing</TableHead>
                                )}
                                {config.noHandle ? (
                                    <TableHead>Qty</TableHead>
                                ) : (
                                    <>
                                        <TableHead>LH</TableHead>
                                        <TableHead>RH</TableHead>
                                    </>
                                )}
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {ctx.sizePriceList?.map((variant, index) => (
                                <Row key={index} variant={variant} />
                            ))}
                        </TableBody>
                    </Table>
                </ScrollArea>
            </Form>
            {door ? (
                <Modal.Footer
                    className={""}
                    submitText="Swap Door"
                    size="sm"
                    onSubmit={ctx.swapDoor}
                >
                    <Button
                        onClick={() => {
                            _modal.close();
                        }}
                        variant="destructive"
                        size="sm"
                    >
                        Cancel Swap
                    </Button>
                </Modal.Footer>
            ) : (
                <Modal.Footer
                    className={""}
                    submitText="Pick More"
                    size="sm"
                    onSubmit={ctx.pickMore}
                >
                    <Button
                        onClick={ctx.removeSelection}
                        variant="destructive"
                        size="sm"
                    >
                        Remove Selection
                    </Button>
                    <div className="flex-1"></div>
                    <Button
                        onClick={ctx.nextStep}
                        variant="secondary"
                        size="sm"
                    >
                        Next Step
                    </Button>
                </Modal.Footer>
            )}
        </Modal.Content>
    );
}
function Row({ variant }) {
    const ctx = useCtx();
    const config = ctx.routeConfig;
    const [salesPrice, basePrice, selected] = ctx.form.watch([
        `selections.${variant.path}.salesPrice`,
        `selections.${variant.path}.basePrice`,
        `selections.${variant.path}.selected`,
    ]);
    return (
        <TableRow className={cn()}>
            <TableCell className="flex flex-col">
                <Label className="whitespace-nowrap">{variant.sizeIn}</Label>
                <Label className="whitespace-nowrap text-muted-foreground">
                    {variant.size}
                </Label>
            </TableCell>
            <TableCell>
                <AuthGuard
                    rules={[_role.is("Super Admin")]}
                    Fallback={<Money value={salesPrice} />}
                >
                    <PriceCell
                        salesPrice={salesPrice}
                        basePrice={basePrice}
                        variant={variant}
                    />
                </AuthGuard>
            </TableCell>
            {config.hasSwing && (
                <TableCell>
                    <FormSelect
                        size="sm"
                        options={doorSwings}
                        label={"Swing"}
                        name={`selections.${variant.path}.swing`}
                        control={ctx.form.control}
                    />
                </TableCell>
            )}
            {config.noHandle ? (
                <TableCell className="w-28">
                    <FormInput
                        qtyInputProps={{
                            min: 0,
                        }}
                        type="number"
                        control={ctx.form.control}
                        size="sm"
                        name={`selections.${variant.path}.qty.total`}
                    />
                </TableCell>
            ) : (
                <>
                    <TableCell className="w-28">
                        <FormInput
                            type="number"
                            qtyInputProps={{
                                min: 0,
                            }}
                            control={ctx.form.control}
                            size="sm"
                            name={`selections.${variant.path}.qty.lh`}
                        />
                    </TableCell>
                    <TableCell className="w-28">
                        <FormInput
                            qtyInputProps={{
                                min: 0,
                            }}
                            type="number"
                            control={ctx.form.control}
                            size="sm"
                            name={`selections.${variant.path}.qty.rh`}
                        />
                    </TableCell>
                </>
            )}
        </TableRow>
    );
}
function PriceCell({ salesPrice, basePrice, variant }) {
    const ctx = useCtx();
    // return <Menu Trigger={}></Menu>
    const [opened, setOpened] = useState(false);
    return (
        <Popover open={opened} onOpenChange={setOpened}>
            <PopoverTrigger>
                <TooltipProvider>
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <Button
                                onClick={() => {
                                    ctx.togglePriceForm(variant.size);
                                }}
                                size="sm"
                                className="h-8"
                                variant={salesPrice ? "default" : "destructive"}
                            >
                                {salesPrice ? (
                                    <Money value={salesPrice} />
                                ) : (
                                    <>Add Price</>
                                )}
                            </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                            <p>Click to edit price</p>
                        </TooltipContent>
                    </Tooltip>
                </TooltipProvider>
            </PopoverTrigger>
            <PopoverContent
                onClick={(e) => {
                    e.preventDefault();
                }}
            >
                <PriceControl
                    priceUpdated={(e) => {
                        setOpened(false);
                    }}
                    salesPrice={salesPrice}
                    basePrice={basePrice}
                    variant={variant}
                />
            </PopoverContent>
        </Popover>
    );
}
function PriceControl({ salesPrice, basePrice, variant, priceUpdated }) {
    const form = useForm({
        defaultValues: {
            price: basePrice || "",
        },
    });
    const ctx = useCtx();
    async function updatePrice() {
        let price = form.getValues("price");
        price = price ? Number(price) : null;
        const data = ctx.priceModel?.formData?.priceVariants?.[variant.size];
        if (data?.id)
            await updateComponentPricingUseCase([
                {
                    id: data.id,
                    price,
                },
            ]);
        else {
            await saveComponentPricingUseCase([
                {
                    id: data.id,
                    price,
                    dependenciesUid: ctx.cls.supplierSizeDep(variant.size),
                    dykeStepId: ctx.priceModel?.formData.dykeStepId,
                    stepProductUid: ctx.priceModel?.formData.stepProductUid,
                },
            ]);
        }
        await ctx.cls.fetchUpdatedPrice();
        toast.success("Pricing Updated.");
        ctx.priceChanged(variant.size, price);
        priceUpdated?.();
    }
    return (
        <Form {...form}>
            <CardHeader>
                <CardTitle>Edit Price</CardTitle>
                <CardDescription>{variant.size}</CardDescription>
            </CardHeader>
            <CardContent>
                <FormInput
                    size="sm"
                    control={form.control}
                    name="price"
                    label="Price"
                    prefix="$"
                />
            </CardContent>
            <CardFooter className="flex justify-end">
                <Button onClick={updatePrice}>Save</Button>
            </CardFooter>
        </Form>
    );
}
