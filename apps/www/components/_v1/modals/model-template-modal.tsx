"use client";

import React, { useEffect, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useBuilders, useStaticProjects } from "@/_v2/hooks/use-static-data";
import {
    _createCommunityTemplate,
    _updateCommunityModel,
} from "@/app/(v1)/_actions/community/community-template";
import { staticProjectsAction } from "@/app/(v1)/_actions/community/projects";
import { _updateModelSearch } from "@/app/(v1)/_actions/community/update-model-search";
import { _createModelTemplate } from "@/app/(v1)/(loggedIn)/settings/community/_components/home-template";
import {
    saveBuilder,
    saveBuilderInstallations,
    saveBuilderTasks,
    staticBuildersAction,
} from "@/app/(v1)/(loggedIn)/settings/community/builders/action";
import { CommunityModels } from "@/db";
import { closeModal } from "@/lib/modal";
import { toastArrayAction } from "@/lib/toast-util";
import { _serverAction, generateRandomString } from "@/lib/utils";
import { useAppSelector } from "@/store";
import { loadStaticList, ModalName } from "@/store/slicers";
import { IBuilder } from "@/types/community";
import { Plus, Trash } from "lucide-react";
import { useFieldArray, useForm } from "react-hook-form";
import { toast } from "sonner";

import { Button } from "@gnd/ui/button";
import { Input } from "@gnd/ui/input";

import { Checkbox } from "@gnd/ui/checkbox";
import { Label } from "@gnd/ui/label";
import AutoComplete from "../auto-complete-tw";
import Btn from "../btn";
import BaseModal from "./base-modal";

export default function ModelTemplateModal({
    formType = "modelTemplate",
}: {
    formType?: ModalName;
}) {
    const route = useRouter();
    const [isSaving, startTransition] = useTransition();
    const form = useForm<CommunityModels>({
        defaultValues: {},
    });

    const projects = useStaticProjects();
    const builders = useBuilders();
    useEffect(() => {
        loadStaticList("staticProjects", projects, staticProjectsAction);
        loadStaticList("staticBuilders", builders, staticBuildersAction);
    }, []);
    async function submit(_data) {
        startTransition(async () => {
            await _serverAction({
                fn: async () => {
                    const data: any = form.getValues();
                    data.meta = {};
                    if (_data?.id) {
                        const models = await _updateCommunityModel(data, _data);
                        return models;
                    }
                    formType == "communityTemplate"
                        ? await _createCommunityTemplate(
                              data,
                              projects.data?.find((p) => p.id == data.projectId)
                                  ?.title,
                          )
                        : await _createModelTemplate(
                              data,
                              builders.data?.find((b) => b.id == data.builderId)
                                  ?.name,
                          );
                },
                onSuccess: async (data) => {
                    if (Array.isArray(data) && data.length > 0) {
                        closeModal();
                        await toastArrayAction({
                            items: data,
                            serverAction: async (item) => {
                                await _updateModelSearch(item);
                            },
                            loading: (item) => `Loading`,
                            _error: (item) => `Item`,
                        });
                    } else {
                        closeModal();
                        toast.success("Success!");
                    }
                },
            });
        });
    }
    async function init(data) {
        console.log(data);
        form.reset(data || { meta: {} });
    }
    return (
        <BaseModal<any>
            className="sm:max-w-[550px]"
            onOpen={(data) => {
                init(data);
            }}
            onClose={() => {}}
            modalName={formType}
            Title={({ data }) => <div>Model Form</div>}
            Content={({ data }) => (
                <div>
                    <div className="grid gap-4 md:grid-cols-2">
                        <div className="col-span-2 grid gap-2">
                            <Label>Model Name</Label>
                            <Input
                                placeholder="Model Name"
                                className="h-8"
                                {...form.register("modelName")}
                            />
                        </div>
                        {formType == "communityTemplate" ? (
                            <AutoComplete
                                label="Project"
                                disabled={data?.data?.id != null}
                                form={form}
                                formKey={"projectId"}
                                options={projects.data || []}
                                itemText={"title"}
                                itemValue={"id"}
                            />
                        ) : (
                            <AutoComplete
                                label="Builder"
                                form={form}
                                formKey={"builderId"}
                                options={builders.data || []}
                                itemText={"name"}
                                itemValue={"id"}
                            />
                        )}
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
