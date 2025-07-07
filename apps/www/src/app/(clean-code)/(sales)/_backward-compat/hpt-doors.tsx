import { chunker } from "@/lib/chunker";
import { Menu } from "../../../../components/(clean-code)/menu";
import { hptDoorsAction, performUpdate } from "./hpt-doors.action";
import { salesStatisticsAction, salesStatUpgrade } from "./sales-stat.action";

export default function HtpDoors({}) {
    async function _salesStatistics() {
        const resp = await hptDoorsAction();
        // const resp = await salesStatisticsAction();
        console.log(resp);
        // return;
        chunker({
            worker: performUpdate,
            list: resp.updates,
            chunkSize: 20,
        });
        console.log(resp);
    }
    return (
        <>
            <Menu.Item onClick={_salesStatistics}>
                Hpt Doors Step Prod
            </Menu.Item>
        </>
    );
}
