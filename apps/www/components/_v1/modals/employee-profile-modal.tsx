"use client";

import React, { useTransition } from "react";
import { useRouter } from "next/navigation";
import { saveEmployeeProfile } from "@/app/(v1)/_actions/hrm/employee-profiles";
import { EmployeeProfile } from "@/db";
import { closeModal } from "@/lib/modal";
import { _useAsync } from "@/lib/use-async";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

import { Input } from "@gnd/ui/input";

import { Label } from "../../ui/label";
import Btn from "../btn";
import BaseModal from "./base-modal";

export default function EmployeeProfileModal() {
    const route = useRouter();
    const [isSaving, startTransition] = useTransition();
    const form = useForm<EmployeeProfile>({
        defaultValues: {},
    });
    async function submit(data) {
        startTransition(async () => {
            // if(!form.getValues)
            try {
                //  const isValid = employeeSchema.parse(form.getValues());
                if (!data?.id)
                    await saveEmployeeProfile({
                        ...form.getValues(),
                        discount: +(form.getValues("discount") || 0),
                        salesComissionPercentage: +(
                            form.getValues("salesComissionPercentage") || 0
                        ),
                    });

                closeModal();
                toast.message("Success!");
                route.refresh();
            } catch (error) {
                toast.message("Invalid Form");
                return;
            }
        });
    }

    async function init(data) {
        form.reset(
            !data
                ? {}
                : {
                      ...data,
                  },
        );
    }
    return (
        <BaseModal<EmployeeProfile | undefined>
            className="sm:max-w-[350px]"
            onOpen={(data) => {
                init(data);
            }}
            onClose={() => {}}
            modalName="employeeProfile"
            Title={({ data }) => (
                <div>
                    {data?.id ? "Edit" : "Create"}
                    {" Employee Profile"}
                </div>
            )}
            Content={({ data }) => (
                <div>
                    <div className="grid gap-4 md:grid-cols-2">
                        <div className="col-span-2 grid gap-2">
                            <Label>Profile Name</Label>
                            <Input
                                placeholder=""
                                className="h-8"
                                {...form.register("name")}
                            />
                        </div>
                        <div className="grid gap-2">
                            <Label>Sales Commission (%)</Label>
                            <Input
                                type="number"
                                className="h-8"
                                {...form.register("salesComissionPercentage")}
                            />
                        </div>
                        <div className="grid gap-2">
                            <Label>Payout Discount (%)</Label>
                            <Input
                                type="number"
                                className="h-8"
                                {...form.register("discount")}
                            />
                        </div>
                    </div>
                </div>
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
