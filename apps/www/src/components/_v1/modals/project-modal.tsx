"use client";

import React, { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useBuilders } from "@/_v2/hooks/use-static-data";
import { saveProject } from "@/app/(v1)/_actions/community/projects";
import { staticBuildersAction } from "@/app/(v1)/(loggedIn)/settings/community/builders/action";
import { CustomerTypes } from "@/db";
import { closeModal } from "@/lib/modal";
import { _useAsync } from "@/lib/use-async";
import { projectSchema } from "@/lib/validations/community-validations";
import { emailSchema } from "@/lib/validations/email";
import { useAppSelector } from "@/store";
import { loadStaticList } from "@/store/slicers";
import { IProject } from "@/types/community";
import { ICustomer } from "@/types/customers";
import { ArrowLeft } from "lucide-react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

import { Button } from "@gnd/ui/button";
import { Input } from "@gnd/ui/input";

import { Label } from "@gnd/ui/label";
import {
    Select,
    SelectContent,
    SelectGroup,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@gnd/ui/select";
import Btn from "../btn";
import BaseModal from "./base-modal";

export default function ProjectModal() {
    const route = useRouter();
    const [isSaving, startTransition] = useTransition();
    const form = useForm<IProject>({
        defaultValues: {},
    });
    async function submit() {
        startTransition(async () => {
            // if(!form.getValues)
            try {
                const isValid = projectSchema.parse(form.getValues());

                await saveProject({
                    ...form.getValues(),
                });
                // resp.
                closeModal();
                toast.message("Project Created!");
            } catch (error) {
                console.log(error);
                toast.message("Invalid Form");
                return;
            }
        });
    }
    const builders = useBuilders();

    async function init(data) {
        form.reset(
            !data
                ? {
                      meta: {},
                  }
                : {
                      ...data,
                  },
        );
    }
    const watchBuilderId = form.watch("builderId");
    return (
        <BaseModal<IProject | undefined>
            className="sm:max-w-[550px]"
            onOpen={(data) => {
                init(data);
            }}
            onClose={() => {}}
            modalName="project"
            Title={({ data }) => <div>Create Project</div>}
            Content={({ data }) => (
                <div>
                    <div className="grid gap-4 md:grid-cols-2">
                        <div className="col-span-2 grid gap-2">
                            <Label>Name</Label>
                            <Input
                                placeholder=""
                                className="h-8"
                                {...form.register("title")}
                            />
                        </div>
                        <div className="grid gap-2">
                            <Label>Ref No.</Label>
                            <Input
                                className="h-8"
                                {...form.register("refNo")}
                            />
                        </div>
                        <div className="grid gap-2">
                            <Label>Builder</Label>
                            <Select
                                onValueChange={(value) => {
                                    form.setValue("builderId", Number(value));
                                }}
                                value={`${watchBuilderId}`}
                            >
                                <SelectTrigger className="h-8">
                                    <SelectValue placeholder="" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectGroup>
                                        {builders.data?.map((builder, _) => (
                                            <SelectItem
                                                key={_}
                                                value={`${builder.id}`}
                                            >
                                                {builder.name}
                                            </SelectItem>
                                        ))}
                                    </SelectGroup>
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="col-span-2 grid gap-2">
                            <Label>Address</Label>
                            <Input
                                className="h-8"
                                {...form.register("address")}
                            />
                        </div>

                        <div className="grid gap-2">
                            <Label>Supervisor</Label>
                            <Input
                                placeholder=""
                                className="h-8"
                                {...form.register("meta.supervisor.name")}
                            />
                        </div>
                        <div className="grid gap-2 ">
                            <Label>Supervisor Email</Label>
                            <Input
                                placeholder=""
                                className="h-8"
                                {...form.register("meta.supervisor.email")}
                            />
                        </div>
                    </div>
                </div>
            )}
            Footer={({ data }) => (
                <Btn
                    isLoading={isSaving}
                    onClick={() => submit()}
                    size="sm"
                    type="submit"
                >
                    Save
                </Btn>
            )}
        />
    );
}
