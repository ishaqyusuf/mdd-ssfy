import { useEffect } from "react";
import salesFormUtils from "@/app/(clean-code)/(sales)/_common/utils/sales-form-utils";
import Money from "@/components/_v1/money";
import Button from "@/components/common/button";
import FormInput from "@/components/common/controls/form-input";
import FormSelect from "@/components/common/controls/form-select";
import { TableCol } from "@/components/common/data-table/table-cells";
import Modal from "@/components/common/modal";
import { useModal } from "@/components/common/modal/provider";
import { cn, sum } from "@/lib/utils";
import { HousePackageToolMeta } from "@/types/sales";
import { useForm, UseFormReturn } from "react-hook-form";

import { Badge } from "@gnd/ui/badge";
import { Form } from "@gnd/ui/form";
import { ScrollArea } from "@gnd/ui/scroll-area";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@gnd/ui/table";

import { useDykeCtx } from "../../_hooks/form-context";
import { useDoorSizes } from "../../_hooks/use-door-size";
import { DykeDoorForm, DykeForm } from "../../../type";

interface Props {
    rowIndex;
    productTitle;
    form: UseFormReturn<DykeForm>;
    onProceed?;
    superAdmin?: boolean;
}
export function useDoorSizeModal(form, rowIndex) {
    const modal = useModal();
    const ctx = useDykeCtx();
    return {
        open(productTitle, args = {}) {
            modal.openModal(
                <DoorSizeModal
                    form={form}
                    productTitle={productTitle}
                    rowIndex={rowIndex}
                    superAdmin={ctx.superAdmin}
                    {...args}
                />,
            );
        },
    };
}
export default function DoorSizeModal({
    rowIndex,
    productTitle,
    form,
    onProceed,
    superAdmin,
}: Props) {
    const basePath = `itemArray.${rowIndex}.multiComponent.components.${productTitle}`;
    const defaultValues = {};

    const _form = useForm<{
        [size in string]: {
            // qty?: number;
            swing?: string;
            jambSizePrice?: number;
            // price?: number;
            lhQty?: number;
            rhQty?: number;
        };
    }>({
        defaultValues,
    });
    const { sizes, isType } = useDoorSizes(form, rowIndex, productTitle);

    useEffect(() => {
        const _values = {};
        const doors = form.getValues(
            `${basePath}._doorForm` as any,
        ) as DykeDoorForm;
        Object.entries(doors || {}).map(([size, doorForm]) => {
            const { swing, jambSizePrice, lhQty, rhQty } = doorForm as any;
            _values[size] = {
                swing,
                jambSizePrice,
                lhQty,
                rhQty,
            };
        });
        _form.reset(_values);
    }, []);
    const modal = useModal();
    function onSubmit() {
        const doors: DykeDoorForm =
            form.getValues(`${basePath}._doorForm` as any) || {};
        const basePriceTags =
            form.getValues(`${basePath}.priceTags` as any) || {};
        const priceTags: HousePackageToolMeta["priceTags"] = {
            doorSizePriceTag: {},
            ...basePriceTags,
        };

        const _formData = _form.getValues();
        let newDoorForm = {};

        Object.entries(_formData).map(
            ([size, { jambSizePrice, lhQty, rhQty, swing }]) => {
                const existingData = doors[size] || {
                    priceData: {
                        type: "door",
                    },
                };
                const _size = sizes.find((s) => s.dim == size);
                const price = (priceTags.doorSizePriceTag[size] = _size.price);

                const _qty = sum([lhQty, rhQty]);
                newDoorForm[size] = {
                    ...existingData,
                    swing,
                    lhQty,
                    rhQty,
                    jambSizePrice: price,
                    priceData: salesFormUtils.componentPrice.update(
                        form,
                        existingData.priceData,
                        _size.basePrice,
                        _qty,
                    ),
                };
            },
        );

        // return;
        form.setValue(`${basePath}._doorForm` as any, newDoorForm);
        form.setValue(`${basePath}.checked` as any, true);

        modal.close();
    }
    function onCancel() {
        form.setValue(`${basePath}.checked` as any, false);
        modal.close();
    }
    function submitAndProceed() {
        onSubmit();
        setTimeout(() => {
            onProceed?.();
        }, 1000);
    }
    return (
        <Form {..._form}>
            <Modal.Content size="lg">
                <Modal.Header
                    title={"Select Door Sizes"}
                    subtitle={productTitle}
                />
                <div className="">
                    <Table className="size-sm table-fixed">
                        <TableHeader>
                            <TableRow>
                                <TableHead colSpan={4}>Size</TableHead>
                                {isType.hasSwing && (
                                    <TableHead colSpan={3}>Swing</TableHead>
                                )}
                                <TableHead colSpan={2}>
                                    {isType.multiHandles ? "LH" : "Qty"}
                                </TableHead>
                                {isType.multiHandles && (
                                    <TableHead colSpan={2}>RH</TableHead>
                                )}
                            </TableRow>
                        </TableHeader>
                    </Table>
                    <ScrollArea className="max-h-[45vh] overflow-auto">
                        <Table className="size-sm table-fixed">
                            <TableBody>
                                {sizes.map((size) => (
                                    <TableRow
                                        className={cn(!size.price && "hidden")}
                                        key={size.dim}
                                    >
                                        <TableCell colSpan={4}>
                                            <div className="flex justify-between">
                                                <TableCol.Primary>
                                                    {size.dimFt}
                                                </TableCol.Primary>
                                                <TableCol.Secondary
                                                    className={cn("")}
                                                >
                                                    {size.basePrice > 0 && (
                                                        <div className="flex gap-2">
                                                            <Badge>
                                                                <Money
                                                                    value={
                                                                        size.basePrice
                                                                    }
                                                                />
                                                            </Badge>
                                                            {superAdmin && (
                                                                <Badge
                                                                    variant={
                                                                        "destructive"
                                                                    }
                                                                >
                                                                    <Money
                                                                        value={
                                                                            size.price
                                                                        }
                                                                    />
                                                                </Badge>
                                                            )}
                                                        </div>
                                                    )}
                                                </TableCol.Secondary>
                                            </div>
                                        </TableCell>
                                        {isType.garage && (
                                            <TableCell colSpan={3}>
                                                <FormSelect
                                                    size="sm"
                                                    options={[
                                                        "In Swing",
                                                        "Out Swing",
                                                    ]}
                                                    control={_form.control}
                                                    name={`${size.dim}.swing`}
                                                />
                                                {/* <FormInput
                                                    control={_form.control}
                                                    className="w-full"
                                                    name={`${size.dim}.swing`}
                                                /> */}
                                            </TableCell>
                                        )}
                                        <TableCell colSpan={2}>
                                            <FormInput
                                                type="number"
                                                size="sm"
                                                className="w-full"
                                                control={_form.control}
                                                name={`${size.dim}.lhQty`}
                                            />
                                        </TableCell>
                                        {isType.multiHandles && (
                                            <TableCell colSpan={2}>
                                                <FormInput
                                                    size="sm"
                                                    type="number"
                                                    className="w-full"
                                                    control={_form.control}
                                                    name={`${size.dim}.rhQty`}
                                                />
                                            </TableCell>
                                        )}
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </ScrollArea>
                </div>
                <Modal.Footer
                    submitText="Select & Proceed"
                    onSubmit={submitAndProceed}
                    submitVariant="outline"
                    cancelText="Select"
                    cancelBtn
                    cancelVariant="default"
                    onCancel={onSubmit}
                >
                    <Button onClick={onCancel} variant="destructive">
                        Remove Selection
                    </Button>
                    <div className="flex-1"></div>
                </Modal.Footer>
            </Modal.Content>
        </Form>
    );
}
