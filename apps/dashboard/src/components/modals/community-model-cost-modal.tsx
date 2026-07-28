import dynamic from "next/dynamic";
import { useCommunityModelCostParams } from "@/hooks/use-community-model-cost-params";
import { CustomModal, CustomModalContent } from "./custom-modal";
import { useTRPC } from "@/trpc/client";
import { useQuery } from "@gnd/ui/tanstack";

import Money from "../_v1/money";

import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@gnd/ui/select";

const CommunityModelCostForm = dynamic(
	() =>
		import("../forms/community-model-cost-form").then(
			(mod) => mod.CommunityModelCostForm,
		),
);

export function CommunityModelCostModal() {
    const {
        editModelCostTemplateId,
        editModelCostId,
        onClose,
        setParams,
    } =
        useCommunityModelCostParams();
    const trpc = useTRPC();
    const { data } = useQuery(
        trpc.community.communityModelCostHistory.queryOptions(
            {
                id: editModelCostTemplateId,
            },
            {
                enabled: !!editModelCostTemplateId,
            }
        )
    );

    return (
        <CustomModal
            open={!!editModelCostTemplateId}
            onOpenChange={(e) => {
                if (!e) {
                    onClose();
                }
            }}
            size="xl"
            title={`Model Cost (${data?.model?.modelName})`}
            description={data?.model?.project?.title}
        >
            {!!editModelCostTemplateId ? (
                <div className="flex flex-col gap-4">
                    <div className="flex gap-4">
                        <Select
                            value={String(editModelCostId)}
                            onValueChange={(e) => {
                                setParams({
                                    editModelCostId: Number(e),
                                });
                            }}
                        >
                            <SelectTrigger className="h-8">
                                <SelectValue placeholder="Select Cost" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="-1">New Cost</SelectItem>
                                {data?.modelCosts?.map((r) => (
                                    <SelectItem
                                        className=""
                                        value={String(r.id)}
                                        key={r.id}
                                    >
                                        <div className="flex gap-4">
                                            <span>{r.title}</span>
                                            <span className="font-semibold">
                                                <Money
                                                    value={r?.meta?.grandTotal}
                                                />
                                            </span>
                                        </div>
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        <div id="cmcAction"></div>
                    </div>
                    <CustomModalContent className="lg:max-h-[55vh] overflow-auto">
                        <CommunityModelCostForm model={data} />
                    </CustomModalContent>
                </div>
            ) : null}
        </CustomModal>
    );
}
