import { useEffect, useState } from "react";
import FormCheckbox from "@/components/common/controls/form-checkbox";
import Modal from "@/components/common/modal";
import { useModal } from "@/components/common/modal/provider";
import { useForm, UseFormReturn } from "react-hook-form";

import { Button } from "@gnd/ui/button";
import { Form } from "@gnd/ui/form";
import { Table, TableBody, TableCell, TableRow } from "@gnd/ui/table";

import { updateDykeStepProductMeta } from "../../_action/dyke-step-setting";
import { DykeForm, DykeStep } from "../../../type";
import { IStepProducts } from "../step-items-list/item-section/step-products";

import {
    getDykeStepState,
    getFormSteps,
} from "../step-items-list/item-section/step-products/init-step-components";

interface Props {
    lineItemIndex: number;
    stepIndex;
    invoiceForm: UseFormReturn<DykeForm>;
    // stepItem?: IStepProducts[number];
    stepItems: IStepProducts;
    stepForm: DykeStep;
    onComplete;
}
export default function DeleteItemModal({
    lineItemIndex,
    stepIndex,
    stepItems,
    invoiceForm,
    stepForm,
    onComplete,
}: Props) {
    const form = useForm({
        defaultValues: {
            deleteSelections: {},
            deletables: [],
        },
    });
    const [deletables, setDeletables] = useState<
        ReturnType<typeof getDykeStepState>
    >([]);
    useEffect(() => {
        const formArray = invoiceForm.getValues(
            `itemArray.${lineItemIndex}.item.formStepArray`,
        );
        const _depFormSteps = getFormSteps(formArray, stepIndex);
        const stateDeps = getDykeStepState(_depFormSteps, stepForm);
        setDeletables(stateDeps);
    }, []);
    const modal = useModal();
    async function submit() {
        const d = form.getValues("deletables");
        const _stepItems = await Promise.all(
            stepItems.map(async (stepItem) => {
                const stepItemMeta = stepItem.meta;
                const stateDeps = {};
                Object.entries({ ...stepItemMeta.deleted, ...d }).map(
                    ([a, b]) => {
                        if (b) {
                            stateDeps[a] = true;
                            delete stepItemMeta.show?.[a];
                            Object.entries(stepItemMeta.show || {}).map(
                                ([k, v]) => {
                                    if (k?.includes(a))
                                        delete stepItemMeta.show?.[k];
                                },
                            );
                        }
                    },
                );
                stepItemMeta.deleted = stateDeps;
                await updateDykeStepProductMeta(stepItem.id, stepItemMeta);
                stepItem._metaData.hidden = true;
                stepItem.meta = stepItemMeta;
                // console.log(stepItemMeta);
                return stepItem;
            }),
        );
        onComplete && onComplete(_stepItems);
        modal.close();
    }
    async function deleteItem() {
        // stepItem.deletedAt = new Date();
        onComplete &&
            onComplete(
                stepItems.map((s) => {
                    s.deletedAt = new Date();
                    return s;
                }),
            );
        modal.close();
    }
    return (
        <Form {...form}>
            <Modal.Content>
                {deletables?.length ? (
                    <>
                        <Modal.Header
                            title={"Delete"}
                            subtitle={
                                "Select component combination to delete this item for"
                            }
                        />
                        <div className="">
                            <Table>
                                <TableBody>
                                    <TableRow>
                                        <TableCell>
                                            <Button
                                                onClick={deleteItem}
                                                className="w-full"
                                                variant="destructive"
                                            >
                                                Delete From System
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                    {deletables?.map((d, i) => (
                                        <TableRow key={i}>
                                            <TableCell>
                                                <FormCheckbox
                                                    control={form.control}
                                                    name={
                                                        `deletables.${d.key}` as any
                                                    }
                                                    label={d.steps
                                                        .map((s) => s.value)
                                                        .join(" & ")}
                                                />
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>
                        <Modal.Footer
                            submitText="Delete"
                            cancelText="Cancel"
                            onSubmit={submit}
                        />
                    </>
                ) : (
                    <>
                        <Modal.Header title={"Confirm Delete"} />
                        <div className="">
                            <span>
                                This component has no dependencies. Continue
                                delete?
                            </span>
                        </div>
                        <Modal.Footer
                            submitText="Delete"
                            cancelText="Cancel"
                            onSubmit={deleteItem}
                        />
                    </>
                )}
            </Modal.Content>
        </Form>
    );
}
