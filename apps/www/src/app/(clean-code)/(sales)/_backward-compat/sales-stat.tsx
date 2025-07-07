import { chunker } from "@/lib/chunker";
import { Menu } from "../../../../components/(clean-code)/menu";
import { loadSalesWithoutStats, updateSalesStats } from "./sales-stat.action";

export default function SalesStat({}) {
    async function _salesStatistics() {
        const resp = await loadSalesWithoutStats();
        console.log(resp);

        chunker({
            worker: updateSalesStats,
            list: resp,
            chunkSize: 50,
        });
        // const resp = await salesStatisticsAction();
        // console.log(resp);
    }
    return (
        <>
            <Menu.Item onClick={_salesStatistics}>Sales Stats</Menu.Item>
        </>
    );
}
