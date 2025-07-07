import { useEffect } from "react";
import AutoComplete from "@/components/_v1/common/auto-complete";
import { Projects } from "@/db";

import { FormControl, FormField, FormItem, FormLabel } from "@gnd/ui/form";

import { useJobSubmitCtx } from "./use-submit-job";

export default function ProjectFormSection({}) {
    const ctx = useJobSubmitCtx();

    const [projectId, homeId, homeList] = ctx.form.watch([
        "job.projectId",
        "job.homeId",
        "homes",
    ]);

    async function projectSelected(e) {
        console.log(e);

        let project: Projects = e.data as any;
        // console.log("REMOVE COST LISTS");
        ctx.costList.remove();
        Object.entries({
            homeId: null,
            "meta.addon": 0,
            "meta.costData": {},
            title: project.title,
            subtitle: "",
            // costList: [],
        }).map(([k, v]) => {
            ctx.setValue(`job.${k}` as any, v as any);
        });
        // ctx.setValue('')
    }

    useEffect(() => {
        ctx.projectChanged();
    }, [projectId]);
    useEffect(() => {
        ctx.homeChanged();
    }, [homeId]);
    return (
        <div className="grid grid-cols-2 gap-2">
            <FormField
                name="job.projectId"
                control={ctx.form.control}
                render={({ field }) => (
                    <FormItem>
                        <FormLabel>Project</FormLabel>
                        <FormControl>
                            {/* <AutoCompleteTw
                                {...field}
                                itemText="title"
                                itemValue="id"
                                options={[
                                    { title: "Custom", id: null },
                                    ...(projects.data || []),
                                ]}
                            /> */}
                            <AutoComplete
                                {...field}
                                itemText={"title"}
                                id={"project"}
                                itemValue={"id"}
                                perPage={9999}
                                options={[
                                    { title: "Custom", id: null },
                                    ...(ctx?.projects?.data || []),
                                ]}
                                onSelect={projectSelected}
                            />
                        </FormControl>
                    </FormItem>
                )}
            />
            {/* <FormAutoCompleteInput label={'Unit'} control={ctx.form.control}

            /> */}
            <FormField
                name="job.homeId"
                control={ctx.form.control}
                render={({ field }) => (
                    <FormItem>
                        <FormLabel>Unit</FormLabel>
                        <FormControl>
                            <AutoComplete
                                // {...field}
                                defaultValue={field.value}
                                onChange={field.onChange}
                                onBlur={field.onBlur}
                                itemText={"name"}
                                perPage={9999}
                                id={"unit"}
                                itemValue={"id"}
                                options={[
                                    { title: "Custom", id: null },
                                    ...(homeList || []),
                                ]}
                                onSelect={ctx.homeSelected}
                            />
                        </FormControl>
                    </FormItem>
                )}
            />
        </div>
    );
}
