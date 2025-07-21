"use client";

import {} from "react";
import { useTransition } from "@/utils/use-safe-transistion";
import Btn from "@/components/_v1/btn";
import { Icons } from "@/components/_v1/icons";
import StatusBadge from "@/components/_v1/status-badge";
import FormInput from "@/components/common/controls/form-input";
import FormSelect from "@/components/common/controls/form-select";
import { TableCol } from "@/components/common/data-table/table-cells";
import useFn from "@/hooks/use-fn";
import { formatDate } from "@/lib/use-day";
import { cn, labelValue, toLabelValue } from "@/lib/utils";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

import { Badge } from "@gnd/ui/badge";
import { Button } from "@gnd/ui/button";
import { Form } from "@gnd/ui/form";
import { Label } from "@gnd/ui/label";
import { Textarea } from "@gnd/ui/textarea";

import { getSalesNote } from "./_actions/get-sales-notes";
import { saveNote } from "./_actions/save-notes";
import Note from "./note";
import { revalidateTable } from "@/components/(clean-code)/data-table/use-infinity-data-table";

export default function SalesNotes({
    salesId,
    edit,
}: {
    salesId;
    edit?: boolean;
}) {
    const { data, refresh } = useFn(() => getSalesNote(salesId));
    const form = useForm({
        defaultValues: {
            progressableId: "-1",
            parentId: salesId,
            progressableType: "SalesOrder",
            type: "All Types",
            description: "",
            headline: "",
            form: edit,
        },
    });
    // const
    const [noteId, type, formMode] = form.watch([
        "progressableId",
        "type",
        "form",
    ]);
    function searchProgress(progress: (typeof data)["progressList"][0]) {
        const nId = Number(noteId);
        return [
            nId > 0 ? progress.progressableId == nId : true,
            type == "All Types" ? true : progress.type?.toLowerCase() == type,
        ].every(Boolean);
    }
    const [saving, startSaving] = useTransition();

    async function save() {
        startSaving(async () => {
            try {
                const formData = form.getValues();
                const { progressableId } = formData;
                const pid = Number(progressableId);
                formData.progressableId = (pid > 0 ? pid : null) as any;
                if (pid > 0) formData.progressableType = "SalesOrderItem";
                if (formData.type == "All Types")
                    throw Error("Select Progress Type");

                const res = await saveNote(formData);

                refresh();
                toast.message("saved");
                form.reset();
            } catch (error) {
                if (error instanceof Error) toast.error(error.message);
            }
        });
    }
    if (!data) return null;
    return (
        <Form {...form}>
            <div className="my-4 grid gap-2 border-t">
                <div className="grid grid-cols-2 gap-4">
                    <FormSelect
                        options={data.items}
                        name="progressableId"
                        control={form.control}
                        label={"Showing"}
                    />
                    <FormSelect
                        options={toLabelValue([
                            "All Types",
                            ...data.progressTypes,
                        ])}
                        name="type"
                        control={form.control}
                        label={"Type"}
                    />
                </div>
                <div className={cn(formMode ? "grid gap-4" : "hidden")}>
                    <FormInput
                        control={form.control}
                        name="headline"
                        placeholder="Headline"
                    />
                    <div
                        className="relative overflow-hidden rounded-lg border bg-background focus-within:ring-1 focus-within:ring-ring"
                        x-chunk="dashboard-03-chunk-1"
                    >
                        <Label htmlFor="message" className="sr-only">
                            Message
                        </Label>
                        <Textarea
                            {...form.register("description")}
                            id="message"
                            placeholder="Type here..."
                            className="min-h-12 resize-none border-0 p-3 shadow-none focus-visible:ring-0"
                        />
                        <div className="flex items-center p-3 pt-0">
                            <div className="flex flex-1 justify-end space-x-2">
                                <Button
                                    type="submit"
                                    size="sm"
                                    disabled={saving}
                                    onClick={() => {
                                        form.setValue("form", false);
                                    }}
                                    variant={"outline"}
                                    className="ml-auto gap-1.5"
                                >
                                    Cancel
                                    {/* <CornerDownLeft className="size-3.5" /> */}
                                </Button>
                                <Btn
                                    isLoading={saving}
                                    onClick={save}
                                    type="submit"
                                    size="sm"
                                    className="ml-auto gap-1.5"
                                >
                                    Save
                                    {/* <CornerDownLeft className="size-3.5" /> */}
                                </Btn>
                            </div>
                        </div>
                    </div>
                </div>
                <div className={cn(formMode ? "hidden" : "flex")}>
                    <div className="flex-1"></div>
                    <Button
                        onClick={() => {
                            form.setValue("form", true);
                        }}
                        size={"sm"}
                        className="h-8"
                    >
                        <span>New</span>
                        <Icons.add className="ml-4 size-4" />
                    </Button>
                </div>
                <div className="-mr-6 flex max-h-[70vh] flex-col overflow-auto pb-20 pr-6">
                    {data?.progressList
                        ?.filter(searchProgress)
                        .map((progress) => (
                            <Note key={progress.id} note={progress} />
                        ))}
                </div>
            </div>
        </Form>
    );
}
