import { getActionNotifications } from "@/actions/cache/get-action-notifications";
import FPage from "@/components/(clean-code)/fikr-ui/f-page";
import { SiteActionNotificationTable } from "@/components/tables/site-action-notification";

import { getUsersListAction } from "@/data-actions/users/get-users";

export default async function Page() {
    const dataPromise = getActionNotifications();
    const userPromise = getUsersListAction({});
    // const ls = Promise.all([getActionNotifications(), getUsersListAction({})]);
    return (
        <FPage title="Action Notification">
            <SiteActionNotificationTable
                dataPromise={dataPromise}
                userPromise={userPromise}
            />
        </FPage>
    );
}
