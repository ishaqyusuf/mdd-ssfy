import { useCommunityModelCostParams } from "@/hooks/use-community-model-cost-params";
import { CustomModal, CustomModalContent } from "./custom-modal";
import { CommunityModelCostForm } from "../forms/community-model-cost-form";
import { useTRPC } from "@/trpc/client";
import { useQuery } from "@tanstack/react-query";

import Money from "../_v1/money";

import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@gnd/ui/select";
import { useDebugConsole } from "@/hooks/use-debug-console";

export function CommunityModelCostModal() {
    const { editModelCostTemplateId, editModelCostId, setParams } =
        useCommunityModelCostParams();
    const trpc = useTRPC();
    const { data, error } = useQuery(
        trpc.community.communityModelCostHistory.queryOptions(
            {
                id: editModelCostTemplateId,
            },
            {
                enabled: !!editModelCostTemplateId,
            },
        ),
    );

    return (
        <CustomModal
            open={!!editModelCostTemplateId}
            onOpenChange={(e) => {
                setParams(null);
            }}
            size="xl"
            title={`Model Cost (${data?.model?.modelName})`}
            description={data?.model?.project?.title}
        >
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
                            {/* <span>Cost:</span> */}
                            <SelectValue placeholder="Select Cost" />
                            {/* <SelectValue asChild placeholder="Select Cost">
                                <div className="flex bg-red-300">
                                    <div className="flex-1"></div>
                                    <span>aa</span>
                                </div>
                            </SelectValue> */}
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
        </CustomModal>
    );
}

