import { useEffect, useState } from "react";
import ConfirmBtn from "@/components/_v1/confirm-btn";
import { Icons } from "@/components/_v1/icons";
import { Menu } from "@/components/(clean-code)/menu";
import FormCheckbox from "@/components/common/controls/form-checkbox";
import FormSelect from "@/components/common/controls/form-select";
import Modal from "@/components/common/modal";
import { useFieldArray } from "react-hook-form";

import { Button } from "@gnd/ui/button";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@gnd/ui/card";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@gnd/ui/dropdown-menu";
import { Form, FormControl, FormField, FormItem } from "@gnd/ui/form";
import { ScrollArea } from "@gnd/ui/scroll-area";
import { Sortable, SortableDragHandle, SortableItem } from "@gnd/ui/sortable";

import { Context, useSettings, useSettingsContext } from "./ctx";
import { GripIcon } from "lucide-react";
import {
    Accordion,
    AccordionContent,
    AccordionItem,
    AccordionTrigger,
} from "@gnd/ui/accordion";
import FormInput from "@/components/common/controls/form-input";
import { useTRPC } from "@/trpc/client";
import { useMutation } from "@tanstack/react-query";
import { toast } from "@gnd/ui/use-toast";

export default function FormSettingsModal({}) {
    const value = useSettingsContext();
    const { arr, salesSetting, createSection } = value;
    return (
        <Form {...value.form}>
            <Context.Provider value={value}>
                <Modal.Content>
                    <Modal.Header
                        title={"Form Step Sequence"}
                        subtitle={
                            "Configure form step sequence for each item section"
                        }
                    />
                    <ScrollArea className="-mx-6 h-[90vh] flex-col gap-4 overflow-auto  px-6">
                        <div className="flex flex-col gap-4 pb-16">
                            <Accordion type="single" collapsible className="">
                                {arr.fields.map((k) => (
                                    <RouteSection key={k._id} uid={k.uid} />
                                ))}
                            </Accordion>
                            <div className="flex justify-end"></div>
                        </div>
                    </ScrollArea>
                    <div className="absolute bottom-0 right-0 z-[9999] w-full border-t bg-white p-4 shadow-lg">
                        <Modal.Footer submitText="Save" onSubmit={value.save}>
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild className="flex">
                                    <Button
                                        variant="outline"
                                        className="items-center justify-center gap-2"
                                    >
                                        <Icons.add className="w-h h-4" />
                                        <span>Section</span>
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent className="">
                                    {salesSetting.rootStep?.stepProducts?.map(
                                        (stepProd) => (
                                            <DropdownMenuItem
                                                onClick={() =>
                                                    createSection(stepProd.uid)
                                                }
                                                disabled={arr.fields.some(
                                                    (s) =>
                                                        s.uid == stepProd.uid,
                                                )}
                                                className="uppercase"
                                                key={stepProd.uid}
                                            >
                                                {stepProd.product?.title}
                                            </DropdownMenuItem>
                                        ),
                                    )}
                                </DropdownMenuContent>
                            </DropdownMenu>
                        </Modal.Footer>
                    </div>
                </Modal.Content>
            </Context.Provider>
        </Form>
    );
}
function RouteSection({ uid }) {
    const ctx = useSettings();
    const arr = useFieldArray({
        control: ctx.form.control,
        name: `data.setting.data.route.${uid}.routeSequence`,
        // keyName: "_id",
    });
    const [steps, setSteps] = useState(ctx.steps);
    const trpc = useTRPC();
    const m = useMutation(
        trpc.sales.createStep.mutationOptions({
            onSuccess(data, variables, context) {
                ctx.form.setValue("data.newStepTitle", null);
                toast({
                    title: "New step created",
                });
                setSteps((current) => {
                    return [...current, data as any];
                });
            },
        }),
    );
    const newStepTitle = ctx.form.watch("data.newStepTitle");

    return (
        <AccordionItem value={uid}>
            <AccordionTrigger>
                {ctx.salesSetting?.rootComponentsByKey?.[uid]?.title}
            </AccordionTrigger>
            <AccordionContent>
                <div className="flex justify-end">
                    <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="w-fit"
                        onClick={() => arr.append({ uid: "" })}
                    >
                        <Icons.add className="size-4" />
                        <span>Step</span>
                    </Button>
                </div>
                <div className="grid gap-4 pb-4">
                    <FormCheckbox
                        switchInput
                        control={ctx.form.control}
                        name={`data.setting.data.route.${uid}.config.noHandle`}
                        label="Single Handle Mode"
                        description="Turn on if this section does not have the Lh and Rh attribute"
                    />
                    <FormCheckbox
                        switchInput
                        control={ctx.form.control}
                        name={`data.setting.data.route.${uid}.config.hasSwing`}
                        label="Swing Input"
                        description="Turn on if this section does not have swing attribute"
                    />
                </div>
                <div className="">
                    <div className="grid grid-cols-2 gap-4 pb-4">
                        <FormCheckbox
                            switchInput
                            control={ctx.form.control}
                            name={`data.setting.data.route.${uid}.config.production`}
                            label="Activate Production"
                        />
                        <FormCheckbox
                            switchInput
                            control={ctx.form.control}
                            name={`data.setting.data.route.${uid}.config.shipping`}
                            label="Activate Shipping"
                        />
                    </div>
                </div>
                <Sortable
                    value={arr.fields}
                    onMove={({ activeIndex, overIndex }) =>
                        arr.move(activeIndex, overIndex)
                    }
                    overlay={
                        <div className="grid grid-cols-[1fr,auto,auto] items-center gap-2">
                            {/* <div className="h-8 w-full rounded-sm bg-primary/10" /> */}
                            <div className="h-8 w-full rounded-sm bg-primary/10" />
                            <div className="size-8 shrink-0 rounded-sm bg-primary/10" />
                            <div className="size-8 shrink-0 rounded-sm bg-primary/10" />
                        </div>
                    }
                >
                    <div className="flex w-full flex-col gap-2">
                        {arr.fields.map((field, index) => (
                            <SortableItem
                                key={field.id}
                                value={field.id}
                                asChild
                            >
                                <div className="grid grid-cols-[1fr,auto,auto] items-center gap-2">
                                    {/* <div>{index}</div> */}
                                    <FormSelect
                                        size="sm"
                                        name={`data.setting.data.route.${uid}.routeSequence.${index}.uid`}
                                        titleKey="title"
                                        valueKey="uid"
                                        options={steps}
                                        control={ctx.form.control}
                                    />

                                    <SortableDragHandle
                                        variant="outline"
                                        size="icon"
                                        className="size-4 shrink-0"
                                    >
                                        <GripIcon
                                            className="size-4"
                                            aria-hidden="true"
                                        />
                                    </SortableDragHandle>
                                    <ConfirmBtn
                                        onClick={() => {
                                            arr.remove(index);
                                        }}
                                        trash
                                        size="icon"
                                    />
                                </div>
                            </SortableItem>
                        ))}
                    </div>
                </Sortable>
                <div className="mt-4 flex justify-end">
                    <div className="flex mx-4 items-center gap-2">
                        <FormInput
                            name="data.newStepTitle"
                            placeholder="New Step"
                            control={ctx.form.control}
                        />
                        <Button
                            onClick={(e) => {
                                m.mutate({
                                    title: newStepTitle,
                                });
                            }}
                            size="sm"
                        >
                            Create
                        </Button>
                    </div>
                    <Button
                        onClick={() => {
                            arr.append({ uid: "" });
                        }}
                        variant="secondary"
                        size="sm"
                    >
                        <Icons.add className="size-4" />
                        <span>Step</span>
                    </Button>
                </div>
            </AccordionContent>
        </AccordionItem>
    );
}
