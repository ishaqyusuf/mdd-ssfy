import { MailData } from "../../use-case/sales-email-use-case";
import { MailboxProvider, useMailboxContext } from "./context";
import EmailForm from "./email-form";
import { MailboxFooter } from "./footer";
import MailboxHeader from "./header";
import MailboxInbox from "./inbox";

interface Props {
    type: MailData["type"];
    id: Number;
}

export default function MailBox(props: Props) {
    const ctx = useMailboxContext(props.id, props.type);
    return (
        <MailboxProvider value={ctx}>
            <div className="">
                {ctx?.id ? (
                    <>
                        <MailboxHeader />
                        <MailboxInbox />
                        <EmailForm />
                        <MailboxFooter />
                    </>
                ) : (
                    <div className=""></div>
                )}
            </div>
        </MailboxProvider>
    );
}
