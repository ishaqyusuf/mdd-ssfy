import FPage from "@/components/(clean-code)/fikr-ui/f-page";
import ClientPage from "@/app-deps/(v2)/(loggedIn)/mail-grid/templates/client-page";
import { getMailGridAction } from "@/app-deps/(v2)/(loggedIn)/mail-grid/templates/actions";

export default async function MailGridPage() {
    const p = getMailGridAction();

    return (
        <FPage title="Mail Templates" roles={["Admin"]}>
            <ClientPage response={p} />
        </FPage>
    );
}
