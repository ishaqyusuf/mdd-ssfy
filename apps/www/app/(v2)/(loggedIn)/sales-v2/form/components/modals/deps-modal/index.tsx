"use  client";

import { saveDykeMeta } from "@/app/(clean-code)/(sales)/sales-book/(form)/_components/modals/deps-modal/action";
import { LegacyDykeFormStepType } from "@/app/(clean-code)/(sales)/sales-book/(form)/_hooks/legacy/use-dyke-form-step";
import FormCheckbox from "@/components/common/controls/form-checkbox";
import Modal from "@/components/common/modal";
import { _modal } from "@/components/common/modal/provider";
import { useForm, UseFormReturn } from "react-hook-form";

import { Form } from "@gnd/ui/form";
import { Table, TableBody, TableCell, TableRow } from "@gnd/ui/table";

import { DykeForm, DykeStep, DykeStepMeta } from "../../../../type";

interface Props {
    form: UseFormReturn<DykeForm>;
    stepForm: DykeStep;
    stepIndex;
    rowIndex;
    stepProducts;
    setStepProducts;
    settingKey: keyof DykeStepMeta;
    stepCtx: LegacyDykeFormStepType;
}
export default function DependenciesModal({
    // form,
    // stepForm,
    // stepIndex,
    // rowIndex,
    settingKey,
    // stepProducts,
    // setStepProducts,
    stepCtx,
}: Props) {
    const stepArray = stepCtx.itemCtx.formSteps();
    const { step: stepForm, stepIndex } = stepCtx;
    const form = stepCtx.mainCtx.form;
    const deps = {};
    if (!stepForm.step.meta[settingKey])
        stepForm.step.meta[settingKey] = {} as any;
    const steps = stepArray
        .filter(
            (_, i) =>
                i < stepIndex &&
                !_.item.meta.hidden &&
                ["Door", "Moulding"].every((s) => s != _.step.title),
        )
        .map((s) => {
            const checked = stepForm.step.meta[settingKey][s.step.uid];
            if (checked) deps[s.step.uid] = true;
            return s.step;
        });

    stepForm.step.meta.priceDepencies = deps;
    const _form = useForm({
        defaultValues: {
            deps,
        },
    });
    async function save() {
        stepForm.step.meta[settingKey] = _form.getValues("deps") as any;
        // delete (stepForm.step.meta as any)[settingKey];
        const _ = await saveDykeMeta(stepForm.step.id, stepForm.step.meta);
        stepCtx.updateStep(stepForm);
        // form.setValue(
        //     `itemArray.${rowIndex}.item.formStepArray.${stepIndex}` as any,
        //     stepForm
        // );
        // setStepProducts(
        //     await initStepComponents(form, {
        //         stepForm,
        //         stepProducts,
        //         stepIndex,
        //         stepArray,
        //     })
        // );
        _modal.close();
    }
    return (
        <Form {..._form}>
            <Modal.Content size="sm">
                <Modal.Header
                    title={
                        settingKey == "priceDepencies"
                            ? `Price Variation Deps`
                            : `Component Deps`
                    }
                    subtitle={stepForm.step.title}
                />
                <Table>
                    <TableBody>
                        {steps.map((step) => (
                            <TableRow key={step.uid}>
                                <TableCell>
                                    <FormCheckbox
                                        control={_form.control}
                                        name={`deps.${step.uid}` as any}
                                        label={step.title}
                                    />
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
                <Modal.Footer submitText="save" onSubmit={save} />
            </Modal.Content>
        </Form>
    );
}
