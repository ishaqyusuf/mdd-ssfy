"use client";

import React, { useEffect, useState } from "react";

import { useRouter } from "next/navigation";
import { _revalidate } from "@/app/(v1)/_actions/_revalidate";
import { staticCommunity } from "@/app/(v1)/_actions/community/community-template";
import {
    _updateCommunityHome,
    createHomesAction,
} from "@/app/(v1)/_actions/community/create-homes";
import { staticProjectsAction } from "@/app/(v1)/_actions/community/projects";
import Modal from "@/components/common/modal";
import { useModal } from "@/components/common/modal/provider";
import { homeSearchMeta } from "@/lib/community/community-utils";
import { closeModal } from "@/lib/modal";
import { _useAsync } from "@/lib/use-async";
import { getModelNumber } from "@/lib/utils";
import { homeSchema } from "@/lib/validations/community-validations";
import { ICommunityTemplate, IHome, IProject } from "@/types/community";
import { Plus } from "lucide-react";
import { useFieldArray, useForm } from "react-hook-form";
import { toast } from "sonner";

import { Button } from "@gnd/ui/button";
import { Input } from "@gnd/ui/input";

import AutoComplete2 from "../../../../../components/_v1/auto-complete-tw";
import ConfirmBtn from "../../../../../components/_v1/confirm-btn";
import { DatePicker } from "../../../../../components/_v1/date-range-picker";
import { Label } from "@gnd/ui/label";
import { useTransition } from "@/utils/use-safe-transistion";

interface FormProps {
    units: IHome[];
    projectId: null;
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
    const route = useRouter();
    const modal = useModal();
    const [isSaving, startTransition] = useTransition();
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
    const projectId = form.watch("projectId");
    async function submit(data) {
        startTransition(async () => {
            // if(!form.getValues)
            let msg = "Units Created!";
            try {
                const formData = form.getValues();
                console.log({ formData });
                if (home?.id) {
                    const unit = formData.units[0] as any;
                    unit.modelName = communityTemplates.find(
                        (f) => f.id == unit.communityTemplateId,
                    )?.modelName as any;
                    await _updateCommunityHome(unit);
                    msg = "Unit updated!";
                } else {
                    const isValid = homeSchema.parse(form.getValues());
                    console.log(formData.units);
                    if (!formData.units) return;
                    const unitForms = formData.units?.map((u) => {
                        const pid = (u.projectId = Number(formData.projectId));
                        u.modelName = communityTemplates.find(
                            (f) => f.id == u.communityTemplateId,
                        )?.modelName as any;
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

                toast.message(msg);
                modal.close();
                _revalidate("homes");
            } catch (error) {
                console.log(error);
                toast.message("Invalid Form");
                return;
            }
        });
    }
    function register(i, key: keyof IHome) {
        return form.register(`units.${i}.${key}` as any);
    }
    const [projects, setProjects] = useState<IProject[]>([]);
    const [communityTemplates, setCommunityTemplates] = useState<
        ICommunityTemplate[]
    >([]);
    const [isReady, setIsReady] = useState(false);
    useEffect(() => {
        async function loadStatics() {
            setProjects((await staticProjectsAction()) as any);
            const cTemplates = (await staticCommunity()) as any;
            // console.log(cTemplates);
            setCommunityTemplates(cTemplates);
        }

        loadStatics();
        console.log("GETTING READY..");
        setTimeout(() => {
            setIsReady(true);
        }, 50);
        // form.setValue("units", home ? [home] : ([{ meta: {} }] as any));

        // if (home?.projectId) form.setValue("projectId", home.projectId);
    }, []);
    function IsReady({ children }) {
        if (!isReady) return null;
        return children;
    }
    return (
        <Modal.Content size="lg">
            <Modal.Header
                title={home?.id ? "Edit Unit" : "Create Units"}
                subtitle={home?.id && home?.project?.title}
            />
            <div>
                <div className="grid gap-4 md:grid-cols-2">
                    <div className="col-span-2">
                        <IsReady>
                            <AutoComplete2
                                disabled={home?.id}
                                label="Project"
                                form={form}
                                formKey={"projectId"}
                                options={projects}
                                itemText={"title"}
                                itemValue="id"
                            />
                        </IsReady>
                        {/* <SelectInput
                label="Project" 
                form={form}
                formKey={"projectId"}
                options={projects}
                labelKey={"title"}
                valueKey="id"
              /> */}
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
                                        {/* <SelectInput
                        form={form}
                        formKey={`units.${i}.modelName`}
                        options={models}
                        labelKey={"modelName"}
                        valueKey="id"
                      /> */}
                                        <IsReady>
                                            <AutoComplete2
                                                form={form}
                                                formKey={`units.${i}.communityTemplateId`}
                                                options={communityTemplates?.filter(
                                                    (m) =>
                                                        m.projectId ==
                                                        projectId,
                                                )}
                                                onSelect={(e) => {
                                                    console.log(e);
                                                }}
                                                uppercase
                                                itemText={"modelName"}
                                                itemValue="id"
                                            />
                                        </IsReady>
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
                                    <Plus className="mr-2 size-4" />
                                    <span>Add Task</span>
                                </Button>
                            )}
                        </div>
                    </div>
                </div>
            </div>
            <Modal.Footer submitText="Save" onSubmit={submit} />
        </Modal.Content>
    );
}
