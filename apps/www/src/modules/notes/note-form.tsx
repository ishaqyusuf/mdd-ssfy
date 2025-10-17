import { useEffect, useState } from "react";
import AutoComplete from "@/components/_v1/common/auto-complete";
import { DatePicker } from "@/components/_v1/date-range-picker";
import { Icons } from "@/components/_v1/icons";
import FormSelect from "@/components/common/controls/form-select";
import { useEnterSubmit } from "@/hooks/use-enter-submit";
import { useForm, useFormContext } from "react-hook-form";
import { toast } from "sonner";
import { Button } from "@gnd/ui/button";
import { Form } from "@gnd/ui/form";
import { createNoteAction } from "./actions/create-note-action";
import { getNoteSuggestionsAction } from "./actions/get-note-suggestions";
import { useNote } from "./context";
export function NoteForm({}) {
    const { props, setNotes } = useNote();
    const { statusFilters, typeFilters } = props;
    const tagFilterKeys = props.tagFilters?.map((a) => a.tagName);
    async function onCreate() {
        const data = form.getValues();
        const { note, eventDate, status, type } = data;
        if (!note) throw new Error("Note cannot be empty");
        const tags = props.tagFilters.filter(
            (a) => !["status", "type"].includes(a.tagName),
        );
        tags.push({
            tagName: "status",
            tagValue: status,
        });
        tags.push({
            tagName: "type",
            tagValue: type,
        });

        const result = await createNoteAction({
            // type: "sales",
            type: type as any,
            status,
            headline: props.headline,
            subject: props.subject,
            eventDate,
            note,
            tags,
        });

        setNotes((current) => {
            return [result, ...current] as any;
        });
    }
    const form = useForm({
        defaultValues: {
            note: "",
            formMode: false,
            type: typeFilters?.[0] || "",
            status: statusFilters?.[0] || "",
            eventDate: null,
        },
    });
    const { formRef, onKeyDown } = useEnterSubmit();
    const [note, formMode, eventDate, type, status] = form.watch([
        "note",
        "formMode",
        "type",
        "status",
        "eventDate",
    ]);
    async function submit() {
        try {
            await onCreate();
            toast.success("Saved.");
            form.reset();
        } catch (error) {
            if (error instanceof Error) toast.error(error.message);
            else toast.error("Unable to complete");
        }
    }
    return (
        <>
            {formMode ? (
                <Form {...form}>
                    <div className="w-full">
                        <div className="flex w-full gap-2">
                            {/* <FormInput
                                className="flex-1"
                                size="sm"
                                placeholder={"Note"}
                                control={form.control}
                                name="note"
                            /> */}
                            <div className="relative flex-1">
                                <NotePad tagFilterKeys={tagFilterKeys} />
                            </div>
                            <Button
                                onClick={(e) => {
                                    form.setValue("formMode", false);
                                }}
                                className=""
                                variant="destructive"
                                size="xs"
                            >
                                Cancel
                            </Button>
                            <Button onClick={submit} size="xs">
                                Saves
                            </Button>
                        </div>
                        <div className="flex gap-4">
                            <FormSelect
                                disabled={!statusFilters?.length}
                                className="w-32"
                                placeholder={"Status"}
                                options={statusFilters}
                                control={form.control}
                                name="status"
                                size="sm"
                            />
                            <FormSelect
                                options={typeFilters}
                                control={form.control}
                                className="w-32"
                                name="type"
                                size="sm"
                            />
                            {!props.admin || (
                                <DatePicker
                                    className="w-auto"
                                    placeholder={"Event date"}
                                    value={!!eventDate ? null : eventDate}
                                    setValue={(e) => {
                                        form.setValue("eventDate", e);
                                    }}
                                    // setValue={changeDueDate}
                                    // value={date}
                                />
                            )}
                        </div>
                    </div>
                </Form>
            ) : (
                <Button
                    onClick={(e) => {
                        form.setValue("formMode", true);
                    }}
                    size="xs"
                    variant="link"
                >
                    <Icons.add className="size-4" />
                    Add Note
                </Button>
            )}
        </>
    );
}
function NotePad({ tagFilterKeys }) {
    const [notes, setNotes] = useState([]);
    const form = useFormContext();
    useEffect(() => {
        getNoteSuggestionsAction(tagFilterKeys).then((res) => {
            setNotes(res);
        });
    }, [tagFilterKeys]);
    return (
        <AutoComplete
            className="w-full flex-1"
            onSelect={(value: any) => {
                // const phone = value.data?.value;
                // if (phone) tx.dotUpdate("phoneNo", phone);
                // else toast.error("Customer must have phone no");

                form.setValue("note", value);
            }}
            // itemText={"label"}
            // itemValue={"value"}
            // options={notes}
            options={[]}
            size="sm"
            placeholder={"Note"}
            allowCreate
            onChange={(e) => {
                form.setValue("note", e);
            }}
            // form={form}
            // formKey={"note"}
            // label={"Select Customer"}
            perPage={10}
        />
    );
}
