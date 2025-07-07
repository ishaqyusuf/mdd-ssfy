import { chunker } from "@/lib/chunker";
import { Menu } from "../../../../components/(clean-code)/menu";
import { hptDoorsAction, performUpdate } from "./hpt-doors.action";
import { salesStatisticsAction, salesStatUpgrade } from "./sales-stat.action";
import {
    fixCustomerTaxProfilesAction,
    updateTaxProfilesAction,
} from "@/actions/--fix/fix-customer-tax-profiles";

export default function FixCustomerTaxProfile({}) {
    async function _salesStatistics() {
        const resp = await fixCustomerTaxProfilesAction();
        // const resp = await salesStatisticsAction();
        console.log(resp);
        // return;
        chunker({
            worker: updateTaxProfilesAction,
            list: resp._data,
            chunkSize: 20,
        });
        // console.log(resp);
    }
    return (
        <>
            <Menu.Item onClick={_salesStatistics}>
                Fix Customer Tax Profile
            </Menu.Item>
        </>
    );
}
