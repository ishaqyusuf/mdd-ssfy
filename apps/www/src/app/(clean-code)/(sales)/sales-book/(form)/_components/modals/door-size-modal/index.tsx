import { createContext, useContext, useEffect, useMemo } from "react";
import { updateStepMetaUseCase } from "@/app/(clean-code)/(sales)/_common/use-case/step-component-use-case";
import { widthList } from "@/app/(clean-code)/(sales)/_common/utils/contants";
import ConfirmBtn from "@/components/_v1/confirm-btn";
import { Icons } from "@/components/_v1/icons";
import { ComboxBox } from "@/components/(clean-code)/custom/controlled/combo-box";
import FormSelect from "@/components/common/controls/form-select";
import Modal from "@/components/common/modal";
import { _modal } from "@/components/common/modal/provider";
import { AlertCircle } from "lucide-react";
import { useFieldArray, useForm } from "react-hook-form";
import { toast } from "sonner";

import { Alert, AlertDescription, AlertTitle } from "@gnd/ui/alert";
import { Badge } from "@gnd/ui/badge";
import { Button } from "@gnd/ui/button";
import { Form } from "@gnd/ui/form";
import { Label } from "@gnd/ui/label";
import { ScrollArea } from "@gnd/ui/scroll-area";

import { useFormDataStore } from "../../../_common/_stores/form-data-store";
import { StepHelperClass } from "../../../_utils/helpers/zus/step-component-class";

interface Props {
    cls: StepHelperClass;
}

const Context = createContext<ReturnType<typeof useInitContext>>(null);
const useCtx = () => useContext(Context);
export function useInitContext(cls: StepHelperClass) {
    const zus = useFormDataStore();
    // const variations = cls.getStepForm().meta?.doorSizeVariation;
    const data = cls.getComponentVariantData();
    const step = cls.getStepForm(); // zus.kvStepForm[stepUid];
    const form = useForm({
        defaultValues: {
            meta: step.meta,
        },
    });
    const varArray = useFieldArray({
        control: form.control,
        name: "meta.doorSizeVariation",
    });
    async function save() {
        const resp = await updateStepMetaUseCase(
            step.stepId,
            form.getValues("meta"),
        );
        _modal.close();
        toast.success("Door Heights saved.");
        cls.updateStepFormMeta(form.getValues("meta"));
    }
    function addRule() {
        varArray.append({
            rules: [{ componentsUid: [], stepUid: null, operator: "is" }],
        });
    }
    return {
        varArray,
        data,
        step,
        form,
        save,
        addRule,
    };
}
export default function DoorSizeModal({ cls }: Props) {
    const ctx = useInitContext(cls);

    return (
        <Context.Provider value={ctx}>
            <Modal.Content size="lg">
                <Modal.Header
                    title={"Door Size Variations"}
                    subtitle={
                        "Add door size variations rules and selected widths for each composed rule"
                    }
                />
                <Form {...ctx.form}>
                    <ScrollArea
                        tabIndex={-1}
                        className="-mx-4 max-h-[50vh] bg-muted  px-4"
                    >
                        {ctx.varArray.fields?.length == 0 ? (
                            <>
                                <div className="">
                                    <span className="text-muted-foreground">
                                        This component has not rules set, which
                                        means it will always be visible in{" "}
                                        <Badge
                                            className="font-mono"
                                            variant="outline"
                                        >
                                            {ctx.step?.title}
                                        </Badge>
                                    </span>
                                </div>
                            </>
                        ) : (
                            <div className="flex flex-col gap-4 ">
                                {ctx.varArray.fields?.map((field, index) => (
                                    <RuleComponent index={index} key={index} />
                                ))}
                            </div>
                        )}
                        <div className="mt-2">
                            <Button
                                onClick={ctx.addRule}
                                size="sm"
                                className="h-8 text-xs"
                            >
                                <Icons.add className="mr-2 size-4" />
                                <span>Add Rule</span>
                            </Button>
                        </div>
                    </ScrollArea>
                </Form>

                <Modal.Footer submitText="Save" onSubmit={ctx.save} />
            </Modal.Content>
        </Context.Provider>
    );
}
function RuleComponent({ index }) {
    const ctx = useCtx();
    const rulesArray = useFieldArray({
        control: ctx.form.control,
        name: `meta.doorSizeVariation.${index}.rules`,
    });
    function addRuleFilter() {
        rulesArray.append({
            componentsUid: [],
            operator: "is",
            stepUid: null,
        });
    }
    function ComponentInput({ fieldIndex }) {
        const stepUid = ctx.form.watch(
            `meta.doorSizeVariation.${index}.rules.${fieldIndex}.stepUid`,
        );
        return (
            <ComboxBox
                maxSelection={999}
                options={ctx.data?.componentsByStepUid[stepUid] || []}
                labelKey="title"
                valueKey="uid"
                className="w-full"
                control={ctx.form.control}
                name={`meta.doorSizeVariation.${index}.rules.${fieldIndex}.componentsUid`}
            />
        );
    }
    return (
        <div className="flex flex-col gap-2 overflow-y-auto rounded border bg-white p-2">
            {rulesArray?.fields?.map((field, fieldIndex) => (
                <div className="flex items-center gap-2" key={fieldIndex}>
                    <div className="min-w-[4.5rem] text-center">
                        <span className="text-sm text-muted-foreground">
                            {fieldIndex == 0 ? "Where" : "and"}
                        </span>
                    </div>
                    <ComboxBox
                        options={ctx.data?.steps}
                        labelKey="title"
                        valueKey="uid"
                        control={ctx.form.control}
                        name={`meta.doorSizeVariation.${index}.rules.${fieldIndex}.stepUid`}
                    />
                    <div className="min-w-[5rem]">
                        <FormSelect
                            control={ctx.form.control}
                            name={`meta.doorSizeVariation.${index}.rules.${fieldIndex}.operator`}
                            size="sm"
                            options={["is", "isNot"]}
                        />
                    </div>
                    <div className="flex-1">
                        <ComponentInput fieldIndex={fieldIndex} />
                    </div>
                    <ConfirmBtn
                        onClick={(e) => {
                            rulesArray.remove(fieldIndex);
                        }}
                        trash
                        size="icon"
                    />
                </div>
            ))}
            <div className="flex justify-end">
                <Button
                    disabled={rulesArray.fields.length == ctx.data.stepsCount}
                    onClick={addRuleFilter}
                    className="h-7 text-xs"
                >
                    <Icons.add className="mr-2 size-4" />
                    <span>Add Filter</span>
                </Button>
            </div>
            <div className="border-t">
                <Label>Width List</Label>
                <ComboxBox
                    maxSelection={999}
                    maxStack={15}
                    options={widthList.map((label) => ({
                        label,
                        value: label,
                    }))}
                    // labelKey="title"
                    // valueKey="uid"
                    className="w-full"
                    control={ctx.form.control}
                    name={`meta.doorSizeVariation.${index}.widthList`}
                />
            </div>
        </div>
    );
}
