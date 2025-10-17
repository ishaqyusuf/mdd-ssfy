import { getDealersPageTabAction } from "./action";
import PageTabsClient from "./page-tabs-client";

export default async function DealerPageTabsServer() {
    const resp = getDealersPageTabAction();
    return (
        <>
            <PageTabsClient response={resp} />
        </>
    );
}
