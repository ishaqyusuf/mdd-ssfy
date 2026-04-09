"use client";

import { ModalName } from "@/store/slicers";
import { ICommunityTemplate, ICostChart } from "@/types/community";
import {
    Cell,
    PrimaryCellContent,
    SecondaryCellContent,
} from "../columns/base-columns";
import Money from "../money";
import { openModal } from "@/lib/modal";
import { Badge } from "@gnd/ui/badge";
import { cn } from "@/lib/utils";

interface Props {
    modal: ModalName;
    row: ICommunityTemplate;
}
export default function InstallCostCell({ modal, row }: Props) {
    const hasCost =
        row.meta?.installCosts?.length || row?.pivot?.meta?.installCost;
    return (
        <Cell className="cursor-pointer" onClick={() => openModal(modal, row)}>
            <Badge
                className={cn(
                    // row.meta?.installCosts?.length > 0 &&
                    // !row?.pivot?.meta?.installCost
                    // ? "bg-orange-200 text-orange-700 hover:bg-orange-200"
                    // :
                    hasCost
                        ? "bg-green-200 text-green-700 hover:bg-green-200"
                        : "bg-slate-200 text-slate-700 hover:bg-slate-200"
                )}
            >
                {hasCost ? "Edit Cost" : "Set Cost"}
            </Badge>
        </Cell>
    );
}
