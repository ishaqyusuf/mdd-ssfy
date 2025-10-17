"use client";

import { ModalName } from "@/store/slicers";
import { ICommunityTemplate, ICostChart } from "@/types/community";
import {
    Cell,
    PrimaryCellContent,
    SecondaryCellContent,
} from "../columns/base-columns";
import Money from "../money";
import { Badge } from "@gnd/ui/badge";
import { useCommunityModelCostParams } from "@/hooks/use-community-model-cost-params";

interface Props {
    costs: ICostChart[];
    modal: ModalName;
    row;
}
export default function ModelCostCell({ costs, modal, row }: Props) {
    const cost: ICostChart = costs?.find((c) => c.current) as any;
    let item: ICommunityTemplate = row;
    let money = cost?.meta?.grandTotal;
    const { setParams } = useCommunityModelCostParams();
    return (
        <Cell
            className="cursor-pointer"
            onClick={() => {
                // openModal(modal, row);
                setParams({
                    editModelCostTemplateId: row.id,
                    editModelCostId: item?.pivot?.modelCosts?.[0]?.id || -1,
                });
            }}
        >
            {
                <>
                    <PrimaryCellContent>
                        {!cost ? (
                            <Badge className="bg-slate-200 text-slate-700 hover:bg-slate-200">
                                Set Cost
                            </Badge>
                        ) : (
                            <Money value={money} />
                        )}
                    </PrimaryCellContent>
                    {costs?.length ? (
                        <SecondaryCellContent>
                            {costs?.length} cost history
                        </SecondaryCellContent>
                    ) : (
                        <></>
                    )}
                </>
            }
        </Cell>
    );
}
