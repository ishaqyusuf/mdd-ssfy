"use client";

import React, { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useStaticProjects } from "@/_v2/hooks/use-static-data";
import { staticProjectsAction } from "@/app/(v1)/_actions/community/projects";
import { findHomeOwnerAction } from "@/app/(v1)/_actions/customer-services/find-home-owner";
import { getProjectUnitList } from "@/app/(v1)/_actions/customer-services/get-project-units";
import {
    createCustomerService,
    updateCustomerService,
} from "@/app/(v1)/_actions/customer-services/save-customer-service";
import { deepCopy } from "@/lib/deep-copy";
import { closeModal } from "@/lib/modal";
import { _useAsync } from "@/lib/use-async";
import { customerServiceSchema } from "@/lib/validations/customer-service";
import { useAppSelector } from "@/store";
import { loadStaticList } from "@/store/slicers";
import { IWorkOrder } from "@/types/customer-service";
import dayjs from "dayjs";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

import { Input } from "@gnd/ui/input";

import { Label } from "@gnd/ui/label";
import { ScrollArea } from "@gnd/ui/scroll-area";
import {
    Select,
    SelectContent,
    SelectGroup,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@gnd/ui/select";
import { Textarea } from "@gnd/ui/textarea";
import AutoComplete2 from "../auto-complete-tw";
import Btn from "../btn";
import { DatePicker } from "../date-range-picker";
import BaseModal from "./base-modal";

export default function CustomerServiceModal() {
    const route = useRouter();
    const [isSaving, startTransition] = useTransition();
    const form = useForm<IWorkOrder>({
        defaultValues: {
            meta: {},
        },
    });

    async function submit(data) {
        startTransition(async () => {
            // if(!form.getValues)
            try {
                const isValid = customerServiceSchema.parse(form.getValues());
                const data = form.getValues();
                if (data.id) await updateCustomerService(data as any);
                else await createCustomerService(data as any);
                closeModal();
                toast.message("Success!");
                route.refresh();
            } catch (error) {
                console.log(error);
                toast.message("Invalid Form");
                return;
            }
        });
    }
    const projects = useStaticProjects();

    async function init(data) {
        // console.log(data);
        let { tech, createdAt, ...formData }: IWorkOrder = deepCopy(
            data
                ? data
                : {
                      requestDate: null, //new Date(),
                      status: "Pending",
                      meta: {
                          lotBlock: "",
                      },
                  },
        );
        if (formData.id) {
            if (formData.scheduleDate)
                formData.scheduleDate = new Date(formData.scheduleDate);
            if (formData.requestDate)
                formData.requestDate = new Date(formData.requestDate);
        }
        if (!formData.meta) formData.meta = {} as any;
        const { meta } = formData;

        const pid = projects.data?.find(
            (p) => p.title == formData.projectName,
        )?.id;

        if (!meta.lotBlock) {
            const { lot, block } = formData;

            if (lot && block) {
                const lb = `${lot}/${block}`;

                // console.log(formData);

                meta.lotBlock = lb;
            }
        }
        // console.log(formData);
        form.reset({
            ...formData,
            meta,
        });

        if (pid) loadUnits(pid);
    }

    async function loadUnits(projectId) {
        const ls = await getProjectUnitList(projectId);
        setUnits(ls.filter((u) => u.lot && u.block));
    }

    const [units, setUnits] = useState<{ id; lotBlock; lot; block }[]>([]);
    async function findHomeOwner(unit) {
        const [projectName, id] = form.getValues(["projectName", "id"]);
        if (!id) {
            Object.entries(
                await findHomeOwnerAction(projectName, unit.lot, unit.block),
            ).map(([k, v]) => form.setValue(k as any, v));
        }
    }
    return (
        <BaseModal<IWorkOrder | undefined>
            className="sm:max-w-[550px]"
            onOpen={(data) => {
                init(data);
            }}
            onClose={() => {}}
            modalName="customerServices"
            Title={({ data }) => (
                <div className="flex items-center space-x-2">Work Order</div>
            )}
            Content={({ data }) => (
                <div>
                    <div className="h-[450px] overflow-auto pr-4 ">
                        <div className="grid gap-4 md:grid-cols-2">
                            <div id="projectName" className="grid gap-2">
                                <AutoComplete2
                                    label="Project"
                                    form={form}
                                    formKey={"projectName"}
                                    options={projects.data || []}
                                    itemText={"title"}
                                    itemValue={"title"}
                                    onSelect={(e: any) => {
                                        loadUnits(e.data.id);
                                        form.setValue("lot", e.data.lot);
                                        form.setValue("block", e.data.block);
                                    }}
                                />
                            </div>
                            <div className="grid gap-2">
                                <AutoComplete2
                                    label="Unit"
                                    form={form}
                                    formKey={"meta.lotBlock"}
                                    options={units}
                                    itemText={"lotBlock"}
                                    itemValue={"lotBlock"}
                                    onSelect={(e: any) => {
                                        form.setValue("lot", e.data.lot);
                                        form.setValue("block", e.data.block);
                                        findHomeOwner(e.data);
                                    }}
                                />
                            </div>
                            <div className="col-span-2 grid gap-2">
                                <Label>Supervisor</Label>
                                <Input
                                    placeholder=""
                                    className="h-8"
                                    {...form.register("supervisor")}
                                />
                            </div>
                            <div className="grid gap-2">
                                <Label>Request Date</Label>
                                <DatePicker
                                    format={"YYYY-MM-DD"}
                                    className="h-8 w-full flex-1"
                                    setValue={(e) =>
                                        form.setValue("requestDate", e)
                                    }
                                    value={form.getValues("requestDate")}
                                />
                            </div>
                            <div className="grid gap-2">
                                <Label>Status</Label>
                                <Select
                                    onValueChange={(v) =>
                                        form.setValue("status", v)
                                    }
                                    defaultValue={
                                        form.getValues("status") as any
                                    }
                                >
                                    <SelectTrigger className="h-8">
                                        <SelectValue placeholder="" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectGroup>
                                            {[
                                                "Pending",
                                                "Scheduled",
                                                "Incomplete",
                                                "Completed",
                                            ].map((opt, _) => (
                                                <SelectItem key={_} value={opt}>
                                                    {opt}
                                                </SelectItem>
                                            ))}
                                        </SelectGroup>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="grid gap-2">
                                <Label>Home Owner</Label>
                                <Input
                                    className="h-8"
                                    {...form.register("homeOwner")}
                                />
                            </div>

                            <div className="grid gap-2">
                                <Label>Home/Cell</Label>
                                <Input
                                    id="homePhone"
                                    className="h-8"
                                    {...form.register("homePhone")}
                                />
                            </div>
                            <div className="col-span-2 grid gap-2">
                                <Label>Home Address</Label>
                                <Input
                                    className="h-8"
                                    {...form.register("homeAddress")}
                                />
                            </div>
                            <div className="grid gap-2">
                                <Label>Schedule Date</Label>
                                <DatePicker
                                    format={"YYYY-MM-DD"}
                                    className="h-8 w-full flex-1"
                                    setValue={(e) =>
                                        form.setValue("scheduleDate", e)
                                    }
                                    value={form.getValues("scheduleDate")}
                                />
                            </div>
                            <div className="grid gap-2">
                                <Label>Schedule Time</Label>
                                <Select
                                    onValueChange={(v) =>
                                        form.setValue("scheduleTime", v)
                                    }
                                    defaultValue={
                                        form.getValues("scheduleTime") as any
                                    }
                                >
                                    <SelectTrigger className="h-8">
                                        <SelectValue placeholder="" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectGroup>
                                            {["8AM To 12PM", "1PM To 4PM"].map(
                                                (opt, _) => (
                                                    <SelectItem
                                                        key={_}
                                                        value={opt}
                                                    >
                                                        {opt}
                                                    </SelectItem>
                                                ),
                                            )}
                                        </SelectGroup>
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="col-span-2 grid gap-2">
                                <Label>Work Description</Label>
                                <Textarea
                                    className="h-8"
                                    {...form.register("description")}
                                />
                            </div>
                        </div>
                    </div>
                </div>
            )}
            Footer={({ data }) => {
                return (
                    <div className="flex items-center space-x-4">
                        <Btn
                            isLoading={isSaving}
                            onClick={submit}
                            size="sm"
                            type="submit"
                        >
                            Submit
                        </Btn>
                    </div>
                );
            }}
        />
    );
}
