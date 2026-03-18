import FPage from "@/components/(clean-code)/fikr-ui/f-page";
import PageClient from "@/app-deps/(v2)/(loggedIn)/sales-v2/dealers/page-client";
import { getDealersAction } from "@/app-deps/(v2)/(loggedIn)/sales-v2/dealers/action";
import PageTabsServer from "@/app-deps/(v2)/(loggedIn)/sales-v2/dealers/page-tabs-server";

export default async function DealersPage(props) {
    const searchParams = await props.searchParams;
    const resp = getDealersAction(searchParams);

    return (
        <FPage title="Dealers">
            <PageTabsServer />
            <PageClient response={resp} />
        </FPage>
    );
}
