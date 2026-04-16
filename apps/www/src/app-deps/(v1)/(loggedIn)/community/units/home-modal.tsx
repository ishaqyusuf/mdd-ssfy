"use client";

import { Icons } from "@gnd/ui/icons";

import React, { useEffect, useState } from "react";

import { staticCommunity } from "@/app-deps/(v1)/_actions/community/community-template";
import { staticProjectsAction } from "@/app-deps/(v1)/_actions/community/projects";
import {
    _updateCommunityHome,
    createHomesAction,
} from "@/app-deps/(v1)/_actions/community/create-homes";
import Modal from "@/components/common/modal";
import { useModal } from "@/components/common/modal/provider";
import { homeSearchMeta } from "@/lib/community/community-utils";
import { getModelNumber } from "@/lib/utils";
import { homeSchema } from "@/lib/validations/community-validations";
import { ICommunityTemplate, IHome, IProject } from "@/types/community";
import { useFieldArray, useForm } from "react-hook-form";

import { Button } from "@gnd/ui/button";
import { Input } from "@gnd/ui/input";

import ConfirmBtn from "../../../../../components/_v1/confirm-btn";
import { DatePicker } from "../../../../../components/_v1/date-range-picker";
import { Label } from "@gnd/ui/label";
import { useTransition } from "@/utils/use-safe-transistion";
import { FormCombobox } from "@/components/common/controls/form-combobox";
import { Form } from "@gnd/ui/form";
import { _qc, _trpc } from "@/components/static-trpc";
import { toast } from "@gnd/ui/use-toast";

interface FormProps {
    units: IHome[];
    projectId: number | null;
}

export function useHomeModal() {
    const modal = useModal();
    return {
        open(home?) {
            // console.log()
            modal.openModal(<HomeModal home={home} />);
        },
    };
}
interface Props {
    home?;
}
export default function HomeModal({ home }: Props) {
    const modal = useModal();
    const [, startTransition] = useTransition();
    const form = useForm<FormProps>({
        defaultValues: home
            ? { ...home, units: [home] }
            : {
                  units: [{ meta: {} }],
              },
    });
    const { fields, remove, append } = useFieldArray({
        control: form.control,
        name: "units",
    });
    const [projects, setProjects] = useState<IProject[]>([]);
    const [communityTemplates, setCommunityTemplates] = useState<
        ICommunityTemplate[]
    >([]);
    const projectId = form.watch("projectId");
    const projectModels = communityTemplates
        ?.filter((model) => model.projectId == projectId)
        ?.map((model) => ({
            id: model.modelName,
            label: model.modelName,
            data: model,
        }));
    const getModelOptions = (currentModelName?: string | null) => {
        const options = [...(projectModels || [])];

        if (
            currentModelName &&
            !options.some((option) => option.id === currentModelName)
        ) {
            options.unshift({
                id: currentModelName,
                label: currentModelName,
                data: null,
            });
        }

        return options;
    };
    async function submit(data) {
        startTransition(async () => {
            // if(!form.getValues)
            let msg = "Units Created!";
            try {
                const formData = form.getValues();

                if (home?.id) {
                    const unit = formData.units[0] as any;
                    if (unit.communityTemplateId) {
                        unit.modelName = communityTemplates.find(
                            (f) => f.id == unit.communityTemplateId,
                        )?.modelName as any;
                    }
                    await _updateCommunityHome(unit);
                    msg = "Unit updated!";
                } else {
                    const isValid = homeSchema.parse(form.getValues());

                    if (!formData.units) return;
                    const unitForms = formData.units?.map((u) => {
                        const pid = (u.projectId = Number(formData.projectId));
                        if (u.communityTemplateId) {
                            u.modelName = communityTemplates.find(
                                (f) => f.id == u.communityTemplateId,
                            )?.modelName as any;
                        }
                        u.modelNo = getModelNumber(u.modelName);
                        u.builderId = Number(
                            projects.find((p) => p.id == pid)?.builderId,
                        );
                        // u.communityTemplateId = Number(
                        //     communityTemplates.find(
                        //         p =>
                        //             p.projectId == pid &&
                        //             p.modelName.toLowerCase() == u.modelName
                        //     )?.id
                        // );
                        u.search = homeSearchMeta(u);
                        u.slug;
                        return u;
                    }) as any;

                    await createHomesAction(unitForms);
                }

                toast({
                    title: msg,
                });
                modal.close();
                _qc.invalidateQueries({
                    queryKey:
                        _trpc.community.getProjectUnits.infiniteQueryKey(),
                });
            } catch (error) {
                toast({ title: "Invalid Form" });
                return;
            }
        });
    }
    function register(i, key: keyof IHome) {
        return form.register(`units.${i}.${key}` as any);
    }
    useEffect(() => {
        async function loadStatics() {
            const projectList = (await staticProjectsAction()) as any;
            const cTemplates = (await staticCommunity()) as any;

            setProjects(projectList);
            setCommunityTemplates(cTemplates);
        }

        loadStatics();
        if (home?.projectId) form.setValue("projectId", home.projectId);
    }, []);

    return (
        <Modal.Content size="lg">
            <Modal.Header
                title={home?.id ? "Edit Unit" : "Create Units"}
                subtitle={home?.id && home?.project?.title}
            />
            <Form {...form}>
                <div className="grid gap-4 md:grid-cols-2">
                    <div className="col-span-2">
                        <FormCombobox
                            control={form.control}
                            name={`projectId`}
                            label="Select Project"
                            transformSelectionValue={(data) => Number(data.id)}
                            handleSelect={(_, __, callback) => {
                                fields.forEach((__, index) => {
                                    form.setValue(
                                        `units.${index}.communityTemplateId`,
                                        null as any,
                                    );
                                    form.setValue(
                                        `units.${index}.modelName`,
                                        "" as any,
                                    );
                                });
                                callback();
                            }}
                            comboProps={{
                                items: projects?.map((i) => ({
                                    id: String(i.id),
                                    label: i.title,
                                    data: i,
                                })),
                            }}
                        />
                    </div>

                    <div className="col-span-2 grid gap-4 md:grid-cols-2">
                        <div className="grid gap-2 md:col-span-2">
                            <div className="grid w-full grid-cols-7 gap-2">
                                <Label className="col-span-2">Model Name</Label>
                                <Label className="col-span-1">Blk</Label>
                                <Label className="col-span-1">Lot</Label>
                                <Label className="col-span-2">Date</Label>
                                <Label className="col-span-1">Home Key</Label>
                            </div>
                            {fields?.map((f, i) => (
                                <div
                                    className="group grid w-full grid-cols-7 items-center gap-2"
                                    key={i}
                                >
                                    <div className="col-span-2">
                                        <FormCombobox
                                            control={form.control}
                                            name={`units.${i}.modelName`}
                                            handleSelect={(_, selected, callback) => {
                                                form.setValue(
                                                    `units.${i}.communityTemplateId`,
                                                    selected?.data?.id ?? null,
                                                );
                                                callback();
                                            }}
                                            handleCreate={(value, callback) => {
                                                form.setValue(
                                                    `units.${i}.communityTemplateId`,
                                                    null,
                                                );
                                                callback();
                                            }}
                                            comboProps={{
                                                items: getModelOptions(
                                                    form.getValues(
                                                        `units.${i}.modelName`,
                                                    ),
                                                ),
                                                searchPlaceholder:
                                                    projectId
                                                        ? "Search or create model..."
                                                        : "Select a project first",
                                                emptyResults: projectId
                                                    ? "No models found for this project"
                                                    : "Select a project first",
                                                disabled: !projectId,
                                                onCreate: () => {},
                                                renderOnCreate: (value) =>
                                                    `Create "${value}"`,
                                            }}
                                        />
                                    </div>
                                    <div className="col-span-1">
                                        <Input
                                            className="h-7"
                                            placeholder=""
                                            {...register(i, "block")}
                                        />
                                    </div>
                                    <div className="col-span-1">
                                        <Input
                                            className="h-7"
                                            placeholder=""
                                            {...register(i, "lot")}
                                        />
                                    </div>

                                    <div className="col-span-2">
                                        <DatePicker
                                            className="h-7 w-auto"
                                            setValue={(e) =>
                                                form.setValue(
                                                    `units.${i}.createdAt`,
                                                    e,
                                                )
                                            }
                                            value={form.getValues(
                                                `units.${i}.createdAt`,
                                            )}
                                        />
                                    </div>
                                    <div className="col-span-1 flex items-center justify-between">
                                        <Input
                                            className="h-7"
                                            placeholder=""
                                            {...register(i, "homeKey")}
                                        />
                                        <div className="flex justify-end">
                                            {!home?.id && (
                                                <ConfirmBtn
                                                    onClick={() => {
                                                        remove(i);
                                                    }}
                                                    variant="ghost"
                                                    size="icon"
                                                    className=""
                                                    trash
                                                ></ConfirmBtn>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            ))}
                            {!home?.id && (
                                <Button
                                    onClick={() => {
                                        append({
                                            meta: {},
                                        } as Partial<IHome> as any);
                                    }}
                                    variant="secondary"
                                    className="mt-1 h-7 w-full"
                                >
                                    <Icons.Plus className="mr-2 size-4" />
                                    <span>Add Task</span>
                                </Button>
                            )}
                        </div>
                    </div>
                </div>
            </Form>
            <Modal.Footer submitText="Save" onSubmit={submit} />
        </Modal.Content>
    );
}
