import { useSalesOverview } from "../overview-provider";

import MailBox from "../../mail-box";

export default function NotificationTab() {
    const ctx = useSalesOverview();
    return <MailBox type="sales" id={ctx.item?.id} />;
    // return (
    //     <div>
    //         <EmailHeader />
    //         <EmailFooterForm />
    //     </div>
    // );
}
