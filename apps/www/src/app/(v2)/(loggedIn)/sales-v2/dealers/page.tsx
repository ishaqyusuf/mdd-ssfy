import FPage from "@/components/(clean-code)/fikr-ui/f-page";
import PageClient from "./page-client";
import { getDealersAction } from "./action";
import PageTabsServer from "./page-tabs-server";

export default async function DealersPage({ searchParams }) {
    const resp = getDealersAction(searchParams);

    return (
        <FPage title="Dealers">
            <PageTabsServer />
            <PageClient response={resp} />
        </FPage>
    );
}
