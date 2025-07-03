"use client";

import React, { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useStaticRoles } from "@/_v2/hooks/use-static-data";
import {
    createEmployeeAction,
    saveEmployeeAction,
} from "@/app/(v1)/_actions/hrm/save-employee";
import { staticRolesAction } from "@/app/(v1)/_actions/hrm/static-roles";
import { closeModal } from "@/lib/modal";
import { _useAsync } from "@/lib/use-async";
import { employeeSchema } from "@/lib/validations/hrm";
import { IUser } from "@/types/hrm";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

import { Input } from "@gnd/ui/input";

import { Label } from "../../ui/label";
import AutoComplete2 from "../auto-complete-tw";
import Btn from "../btn";
import BaseModal from "./base-modal";

export default function EmployeeModal() {
    const route = useRouter();
    const [isSaving, startTransition] = useTransition();
    const form = useForm<IUser>({
        defaultValues: {},
    });
    async function submit(data) {
        startTransition(async () => {
            try {
                const isValid = employeeSchema.parse(form.getValues());
                if (!data?.id)
                    await createEmployeeAction({
                        ...form.getValues(),
                    });
                else
                    await saveEmployeeAction({
                        ...form.getValues(),
                    });
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
    const role = useStaticRoles(); //useStaticData('staticRoles',staticRolesAction);

    async function init(data) {
        // loadStaticList("staticRoles", roles, staticRolesAction);

        form.reset(
            !data
                ? {}
                : {
                      ...data,
                  },
        );
    }
    return (
        <BaseModal<IUser | undefined>
            className="sm:max-w-[550px]"
            onOpen={(data) => {
                init(data);
            }}
            onClose={() => {}}
            modalName="employee"
            Title={({ data }) => (
                <div>
                    {data?.id ? "Edit" : "Create"}
                    {" Employee"}
                </div>
            )}
            Content={({ data }) => (
                <div>
                    <div className="grid gap-4 md:grid-cols-2">
                        <div className="col-span-2 grid gap-2">
                            <Label>Name</Label>
                            <Input
                                placeholder=""
                                className="h-8"
                                {...form.register("name")}
                            />
                        </div>
                        <div className="grid gap-2">
                            <Label>Username</Label>
                            <Input
                                className="h-8"
                                {...form.register("username")}
                            />
                        </div>
                        <div className="grid gap-2">
                            <Label>Email</Label>
                            <Input
                                className="h-8"
                                {...form.register("email")}
                            />
                        </div>
                        <div className="grid gap-2">
                            <Label>Phone No</Label>
                            <Input
                                className="h-8"
                                {...form.register("phoneNo")}
                            />
                        </div>
                        <div className="grid gap-2">
                            <Label>Role</Label>
                            <AutoComplete2
                                form={form}
                                options={role.data}
                                formKey={"role.id"}
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
