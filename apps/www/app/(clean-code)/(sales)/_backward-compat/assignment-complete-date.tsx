"use client";

import { chunker } from "@/lib/chunker";

import { Menu } from "../../../../components/(clean-code)/menu";
import {
    getAssignmentCompleteDateList,
    performUpdate,
} from "./assignment-complete-date-action";

export function AssignmentCompleteDate({}) {
    async function _salesStatistics() {
        const resp = await getAssignmentCompleteDateList();
        // const resp = await salesStatisticsAction();
        console.log(resp);
        return;
        chunker({
            worker: performUpdate,
            list: resp,
            chunkSize: 10,
        });
        console.log(resp);
    }
    return (
        <Menu.Item onClick={_salesStatistics}>
            Assignment Complete Date
        </Menu.Item>
    );
}
