"use client";

import { useLoadingToast } from "@/hooks/use-loading-toast";
import { chunker } from "@/lib/chunker";

import { Menu } from "../../../../components/(clean-code)/menu";
import {
    getAssignmentCompleteDateList,
    performUpdate,
} from "./assignment-complete-date-action";

export function AssignmentCompleteDate({}) {
    const loadingToast = useLoadingToast();
    async function _salesStatistics() {
        const resp = await getAssignmentCompleteDateList();
        // const resp = await salesStatisticsAction();
        console.log(resp);
        // return;
        chunker({
            worker: performUpdate,
            list: resp,
            // loadingToast,
            chunkSize: 10,
        });
    }
    return (
        <Menu.Item onClick={_salesStatistics}>
            Assignment Complete Date
        </Menu.Item>
    );
}
