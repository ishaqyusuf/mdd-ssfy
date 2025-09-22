import { getActionNotifications } from "@/actions/cache/get-action-notifications";
import FPage from "@/components/(clean-code)/fikr-ui/f-page";
import { SiteActionNotificationTable } from "@/components/tables/site-action-notification";

export default async function Page() {
    const dataPromise = getActionNotifications();
    // const ls = Promise.all([getActionNotifications(), getUsersListAction({})]);
    return (
        <FPage title="Action Notification">
            {/* <SiteActionNotificationTable
                dataPromise={dataPromise}
                userPromise={userPromise}
            /> */}
        </FPage>
    );
}
