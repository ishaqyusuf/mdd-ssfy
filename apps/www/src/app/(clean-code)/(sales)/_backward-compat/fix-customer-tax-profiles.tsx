import { chunker } from "@/lib/chunker";
import { Menu } from "@gnd/ui/custom/menu";
import {
    fixCustomerTaxProfilesAction,
    updateTaxProfilesAction,
} from "@/actions/--fix/fix-customer-tax-profiles";

export default function FixCustomerTaxProfile({}) {
    async function _salesStatistics() {
        const resp = await fixCustomerTaxProfilesAction();
        // const resp = await salesStatisticsAction();

        // return;
        chunker({
            worker: updateTaxProfilesAction,
            list: resp._data,
            chunkSize: 20,
        });
    }
    return (
        <>
            <Menu.Item onClick={_salesStatistics}>
                Fix Customer Tax Profile
            </Menu.Item>
        </>
    );
}
