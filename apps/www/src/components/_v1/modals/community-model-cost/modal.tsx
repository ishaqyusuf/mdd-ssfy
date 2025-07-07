"use client";

import { _getModelCostStat } from "@/app/(v1)/_actions/community/_model-cost-stat";
import { deepCopy } from "@/lib/deep-copy";
import { ICommunityCosts, ICommunityTemplate } from "@/types/community";
import { UseFormReturn, useForm } from "react-hook-form";
import BaseModal from "../base-modal";
import {
    _deleteCommunityModelCost,
    _saveCommunitModelCostData,
} from "@/app/(v1)/_actions/community/community-model-cost";
import { _getCommunityModelCostUnits } from "@/app/(v1)/_actions/community/community-model-cost-units";
import { CommunityCostHistory } from "./cost-history";
import { CommunityCostForm } from "./cost-form";

export default function CommunityModelCostModal() {
    const form = useForm<FormProps>({
        defaultValues: {
            index: 0,
            costs: [],
            stats: {},
        },
    });
    const watchIndex = form.watch("index");
    async function loadUnits(data: ICommunityTemplate) {
        form.setValue(
            "template",
            await _getCommunityModelCostUnits({
                pivotId: data.pivotId,
                communityId: data.id,
            })
        );
    }
    async function onOpen(data: ICommunityTemplate) {
        let modelCosts = data?.pivot?.modelCosts;
        if (!modelCosts || !modelCosts.length)
            modelCosts = [{ meta: {} } as any];
        const costs = deepCopy<ICommunityCosts[]>(modelCosts).map((c) => {
            (c as any)._id = c.id;
            return c;
        });
        // setModelCosts(costs)
        const stats = await _getModelCostStat(costs as any, data.id);
        form.reset({
            index: 0,
            costs: costs as any,
            stats,
        });
        await loadUnits(data);
    }

    return (
        <BaseModal
            className="sm:max-w-[700px]"
            onOpen={onOpen}
            modalName="modelCost"
            Title={({ data }) => <div>Model Cost ({data?.modelName})</div>}
            Subtitle={({ data }) => <>{data?.project?.title}</>}
            Content={({ data }) => (
                <>
                    <div className="flex w-full divide-x -mb-10">
                        <CommunityCostHistory
                            watchIndex={watchIndex}
                            form={form}
                            data={data}
                        />

                        <CommunityCostForm
                            watchIndex={watchIndex}
                            form={form}
                            data={data}
                        />
                    </div>
                </>
            )}
        />
    );
}
export interface ModelCostProps {
    form: UseFormReturn<FormProps>;
    data;
    watchIndex;
}
interface FormProps {
    costs: (ICommunityCosts & { _id })[];
    index;
    stats: {
        [k in any]: number;
    };
    template?: ICommunityTemplate;
}
