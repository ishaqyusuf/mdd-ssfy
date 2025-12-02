import PageTabsClient from "@/app-deps/(v2)/(loggedIn)/sales-v2/dealers/page-tabs-client";
import { getSalesTabAction } from "@/app-deps/(v2)/(loggedIn)/sales/dashboard/_actions/get-sales-tab-action";

export default async function ServerTab() {
    const resp = getSalesTabAction();
    return (
        <>
            <PageTabsClient response={resp} />
        </>
    );
}
