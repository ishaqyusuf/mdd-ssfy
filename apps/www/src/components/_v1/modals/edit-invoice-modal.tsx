"use client";

import React, { useEffect, useState } from "react";
import { useTransition } from "@/utils/use-safe-transistion";
import { useRouter } from "next/navigation";
import { deleteInvoiceTasks } from "@/app/(v1)/_actions/community-invoice/delete-invoice-task";
import {
    updateInvoiceTasksAction,
    UpdateIvoiceTasksActionProps,
} from "@/app/(v1)/_actions/community-invoice/update-invoice-tasks";
import { closeModal } from "@/lib/modal";
import { ExtendedHome, IHomeTask, IHomeTaskList } from "@/types/community";
import { UpdateOrderPriorityProps } from "@/types/sales";
import { Plus } from "lucide-react";
import { useFieldArray, useForm } from "react-hook-form";
import { toast } from "sonner";

import { Button } from "@gnd/ui/button";
import { Input } from "@gnd/ui/input";

import { Label } from "@gnd/ui/label";
import { ScrollArea } from "@gnd/ui/scroll-area";
import Btn from "../btn";
import ConfirmBtn from "../confirm-btn";
import { DatePicker } from "../date-range-picker";
import Money from "../money";
import BaseModal from "./base-modal";

export default function EditInvoiceModal() {
    const route = useRouter();
    const [isSaving, startTransition] = useTransition();
    const form = useForm<{
        tasks: IHomeTask[];
        sumPaid;
        sumDue;
    }>({
        defaultValues: {
            tasks: [],
        },
    });
    // const watchTasks = form.watch("tasks");
    const { fields, remove, append } = useFieldArray({
        control: form.control,
        name: "tasks",
    });
    async function submit(data?: ExtendedHome) {
        if (!data) return;
        startTransition(async () => {
            try {
                const tasks = form.getValues("tasks");
                const payload: UpdateIvoiceTasksActionProps = {
                    create: [],
                    update: [],
                };
                tasks.map((t) => {
                    t.amountDue = Number(t.amountDue);
                    t.amountPaid = Number(t.amountPaid);
                    console.log(t);
                    if (!t.id) {
                        if (!t.taskUid)
                            payload.create.push({
                                ...t,
                                homeId: data.id,
                                projectId: data.projectId,
                                search: data.search,
                                meta: {},
                            } as any);
                    } else {
                        const old = data.tasks.find((ot) => ot.id == t.id);
                        const { amountDue, amountPaid, checkNo, checkDate } = t;
                        if (
                            old?.amountDue != t.amountDue ||
                            old?.amountPaid != t.amountPaid ||
                            old?.checkNo != t.checkNo ||
                            old?.checkDate != t.checkDate ||
                            old?.taskName != t.taskName
                        ) {
                            payload.update.push({
                                id: t.id,
                                data: {
                                    taskName: t.taskName,
                                    amountDue,
                                    amountPaid,
                                    checkNo,
                                    checkDate,
                                    createdAt: t.createdAt,
                                } as any,
                            });
                        }
                    }
                });
                await updateInvoiceTasksAction(payload);
                closeModal();
                toast.message("Invoice Updated!");
                route.refresh();
            } catch (error) {
                console.log(error);
                toast.message("Invalid Form");
                return;
            }
        });
    }
    const [deleteIds, setDeleteIds] = useState<number[]>([]);
    useEffect(() => {
        console.log(deleteIds);
        if (deleteIds.length) {
            (async () => {
                await deleteInvoiceTasks(deleteIds);
                console.log("DELETED");
                setDeleteIds([]);
            })();
        }
    }, [deleteIds]);
    async function init(data: ExtendedHome) {
        console.log(data);
        const tasks: any = [];
        const deleteIds: number[] = [];
        data.tasks.map((t) => {
            if (!tasks.find((ot) => t.taskName == ot.taskName)) tasks.push(t);
            else deleteIds.push(t.id);
        });
        setDeleteIds(deleteIds);

        form.reset({
            ...data,
            tasks,
        });
    }
    function register(i, key: keyof IHomeTaskList) {
        return form.register(`tasks.${i}.${key}` as any);
    }
    async function deleteTask(i, task: IHomeTaskList) {
        const tid = form.getValues(`tasks.${i}.id`);
        console.log(tid);
        if (tid) await deleteInvoiceTasks([tid]);
        remove(i);
    }
    // useEffect(() => {
    //     console.log(watchTasks);
    // }, [watchTasks]);
    return (
        <BaseModal<ExtendedHome>
            className="sm:max-w-[750px]"
            onOpen={(data) => {
                init(data);
            }}
            onClose={() => {}}
            modalName="editInvoice"
            Title={({ data }) => (
                <div>
                    {data?.project.title} {data?.modelName} {data?.lot} {"/"}
                    {data?.block}
                </div>
            )}
            Content={({ data }) => (
                <ScrollArea className="max-h-[50vh] min-h-max">
                    <div className="grid gap-4 md:grid-cols-2">
                        <div className="col-span-2 grid gap-2">
                            <div className="grid grid-cols-7 gap-2">
                                <Label className="col-span-2">Task Name</Label>
                                <Label className="col-span-1">Due ($)</Label>
                                <Label className="col-span-1">Paid ($)</Label>
                                <Label className="col-span-1">Check</Label>
                                <Label className="col-span-2">Date</Label>
                            </div>
                            {fields?.map((f, i) => (
                                <div
                                    className="group grid grid-cols-7 items-center gap-2"
                                    key={i}
                                >
                                    <div className="col-span-2">
                                        <Input
                                            className="h-7"
                                            disabled={f.taskUid != null}
                                            placeholder=""
                                            {...register(i, "taskName")}
                                        />
                                    </div>
                                    <div className="col-span-1">
                                        <Input
                                            className="h-7"
                                            disabled={f.taskUid != null}
                                            placeholder=""
                                            type="number"
                                            {...register(i, "amountDue")}
                                        />
                                    </div>
                                    <div className="col-span-1">
                                        <Input
                                            className="h-7"
                                            placeholder=""
                                            type="number"
                                            {...register(i, "amountPaid")}
                                        />
                                    </div>
                                    <div className="col-span-1">
                                        <Input
                                            className="h-7"
                                            placeholder=""
                                            {...register(i, "checkNo")}
                                        />
                                    </div>
                                    <div className="col-span-2 flex">
                                        <div className="flex-1">
                                            <DatePicker
                                                format={"YYYY-MM-DD"}
                                                className="h-7 w-full flex-1"
                                                setValue={(e) =>
                                                    form.setValue(
                                                        `tasks.${i}.checkDate`,
                                                        e,
                                                    )
                                                }
                                                value={form.getValues(
                                                    `tasks.${i}.checkDate`,
                                                )}
                                            />
                                        </div>
                                        <div className="">
                                            <ConfirmBtn
                                                disabled={f.taskUid != null}
                                                onClick={() => {
                                                    deleteTask(i, f);
                                                }}
                                                variant="ghost"
                                                size="icon"
                                                className=""
                                                trash
                                            ></ConfirmBtn>
                                        </div>
                                    </div>
                                </div>
                            ))}
                            {/* <div className="grid grid-cols-7 gap-4 text-sm font-semibold bg-slate-50">
                                <div className="col-span-1 col-start-3">
                                    <Money
                                        value={form.getValues("sumDue") || 0}
                                    />
                                </div>
                                <div className="col-span-1">
                                    <Money value={form.getValues("sumPaid")} />
                                </div>
                            </div> */}
                            <Button
                                onClick={() => {
                                    append({
                                        meta: {},
                                    } as Partial<IHomeTask> as any);
                                }}
                                variant="secondary"
                                className="mt-1 h-7 w-full"
                            >
                                <Plus className="mr-2 size-4" />
                                <span>Add Task</span>
                            </Button>
                        </div>
                    </div>
                </ScrollArea>
            )}
            Footer={({ data }) => (
                <Btn
                    isLoading={isSaving}
                    onClick={() => submit(data)}
                    size="sm"
                    type="submit"
                >
                    Save
                </Btn>
            )}
        />
    );
}
