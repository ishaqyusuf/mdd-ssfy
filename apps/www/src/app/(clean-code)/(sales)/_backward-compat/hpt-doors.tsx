import { chunker } from "@/lib/chunker";
import { Menu } from "@/components/(clean-code)/menu";
import { hptDoorsAction, performUpdate } from "./hpt-doors.action";

export default function HtpDoors({}) {
    async function _salesStatistics() {
        const resp = await hptDoorsAction();
        // const resp = await salesStatisticsAction();

        // return;
        chunker({
            worker: performUpdate,
            list: resp.updates,
            chunkSize: 20,
        });
    }
    return (
        <>
            <Menu.Item onClick={_salesStatistics}>
                Hpt Doors Step Prod
            </Menu.Item>
        </>
    );
}
