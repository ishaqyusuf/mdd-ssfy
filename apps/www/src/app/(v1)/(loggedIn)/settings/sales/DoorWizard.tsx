"use client";

import * as React from "react";
import { deepCopy } from "@/lib/deep-copy";
import { ISalesSetting, ISalesWizardForm } from "@/types/post";
import { Edit2, Trash } from "lucide-react";
import { DragDropContext, Draggable, Droppable } from "react-beautiful-dnd";
import { useFieldArray, useForm, UseFormReturn } from "react-hook-form";
import { v4 as randomUUID } from "uuid";

import { Button } from "@gnd/ui/button";
import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormLabel,
} from "@gnd/ui/form";
import { Separator } from "@gnd/ui/separator";
import { Textarea } from "@gnd/ui/textarea";

import WizardForm from "./components/wizard-form";

export default function DoorWizardSettings({
    form,
}: {
    form: UseFormReturn<ISalesSetting>;
}) {
    const { fields, append, update, replace } = useFieldArray({
        control: form.control,
        name: "meta.wizard.form",
    });
    // update()
    const [open, setOpen] = React.useState(false);

    const wizardForm = useForm<{
        rowIndex;
        wizard: ISalesWizardForm;
    }>({
        defaultValues: {},
    });
    const handleOndragEnd = (result) => {
        if (!result.destination) return;
        const items = Array.from(fields);
        const [reorderedItem] = items.splice(result.source.index, 1);
        items.splice(result.destination.index, 0, reorderedItem as any);
        replace(items);
    };
    return (
        <div className="space-y-6">
            <div className="flex justify-between">
                <div>
                    <h3 className="text-lg font-medium">Door Wizard</h3>
                    <p className="text-sm text-muted-foreground">
                        Configure door component wizard
                    </p>
                </div>
                <div>
                    <Button
                        className="h-8 "
                        onClick={() => {
                            wizardForm.reset({
                                //    rowIndex,
                                wizard: {
                                    uuid: randomUUID(),
                                },
                            });
                            setOpen(true);
                        }}
                    >
                        Add
                    </Button>
                </div>
            </div>
            <Separator />
            <div>
                <Form {...form}>
                    <FormField
                        control={form.control}
                        name="meta.wizard.titleMarkdown"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Title Markdown</FormLabel>
                                <FormControl>
                                    <Textarea className="sh-8" {...field} />
                                </FormControl>
                            </FormItem>
                        )}
                    />
                </Form>
            </div>
            <div>
                {/* <Plate
          plugins={[
            createParagraphPlugin({}),
            createHeadingPlugin(),
            createComboboxPlugin(),
            createMentionPlugin(),
            createIndentPlugin({
              inject: {
                props: {
                  validTypes: [ELEMENT_PARAGRAPH],
                },
              },
            }),
          ]}
          editableProps={{}}
        >
         
        </Plate> */}
            </div>
            <DragDropContext onDragEnd={handleOndragEnd}>
                <Droppable droppableId="droppable-1">
                    {(provided) => {
                        return (
                            <ul
                                role="list"
                                ref={provided.innerRef}
                                {...provided.droppableProps}
                            >
                                {fields
                                    // .filter((item) => !item.deleted)
                                    .map(
                                        (field, rowIndex) =>
                                            !field.deleted && (
                                                <Draggable
                                                    key={rowIndex}
                                                    draggableId={field.id}
                                                    index={rowIndex}
                                                >
                                                    {(provided) => {
                                                        return (
                                                            <div
                                                                {...provided.draggableProps}
                                                                {...provided.dragHandleProps}
                                                                ref={
                                                                    provided.innerRef
                                                                }
                                                                key={field.id}
                                                                className="flex w-full items-center rounded border-b p-2"
                                                            >
                                                                <div className="flex flex-1">
                                                                    {/* <div className="w-5">{rowIndex + 1}.</div> */}
                                                                    <h4>
                                                                        {field.label ||
                                                                            "No Label"}
                                                                    </h4>
                                                                </div>
                                                                <div className="inline-flex space-x-2">
                                                                    <Button
                                                                        className="h-8"
                                                                        onClick={() => {
                                                                            wizardForm.reset(
                                                                                {
                                                                                    rowIndex,
                                                                                    wizard: deepCopy(
                                                                                        field,
                                                                                    ),
                                                                                },
                                                                            );
                                                                            setOpen(
                                                                                true,
                                                                            );
                                                                        }}
                                                                        size="sm"
                                                                        variant={
                                                                            "secondary"
                                                                        }
                                                                    >
                                                                        <Edit2 className="h-3.5 w-3.5 " />
                                                                    </Button>
                                                                    <Button
                                                                        className="h-8"
                                                                        onClick={() => {
                                                                            // wizardForm.setValue('')
                                                                            update(
                                                                                rowIndex,
                                                                                {
                                                                                    ...field,
                                                                                    deleted:
                                                                                        true,
                                                                                },
                                                                            );
                                                                        }}
                                                                        size="sm"
                                                                        variant={
                                                                            "secondary"
                                                                        }
                                                                    >
                                                                        <Trash className="h-3.5 w-3.5 " />
                                                                    </Button>
                                                                </div>
                                                            </div>
                                                        );
                                                    }}
                                                </Draggable>
                                            ),
                                    )}
                                {provided.placeholder}
                            </ul>
                        );
                    }}
                </Droppable>
            </DragDropContext>

            <WizardForm
                form={wizardForm}
                append={append}
                setOpen={setOpen}
                open={open}
                fields={fields}
                save={() => {
                    const { rowIndex, wizard } = wizardForm.getValues();
                    if (rowIndex >= 0) update(rowIndex, deepCopy(wizard));
                    else append(deepCopy(wizard));
                    setOpen(false);
                }}
            />
        </div>
    );
}

