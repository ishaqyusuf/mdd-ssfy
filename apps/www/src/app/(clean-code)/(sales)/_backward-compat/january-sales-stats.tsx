import { chunker } from "@/lib/chunker";
import { Menu } from "../../../../components/(clean-code)/menu";
import { loadSalesWithoutStats, updateSalesStats } from "./sales-stat.action";
import { getJanuarySalesAction } from "./actions";

export default function JanSalesStat({}) {
    async function _salesStatistics() {
        const resp = await getJanuarySalesAction();
        console.log(resp);

        // chunker({
        //     worker: updateSalesStats,
        //     list: resp,
        //     chunkSize: 50,
        // });
        // const resp = await salesStatisticsAction();
        // console.log(resp);
    }
    return (
        <>
            <Menu.Item onClick={_salesStatistics}>Jan Stats</Menu.Item>
        </>
    );
}
