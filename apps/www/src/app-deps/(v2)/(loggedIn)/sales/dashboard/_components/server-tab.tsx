import PageTabsClient from "../../../sales-v2/dealers/page-tabs-client";
import { getSalesTabAction } from "../_actions/get-sales-tab-action";

export default async function ServerTab() {
    const resp = getSalesTabAction();
    return (
        <>
            <PageTabsClient response={resp} />
        </>
    );
}
