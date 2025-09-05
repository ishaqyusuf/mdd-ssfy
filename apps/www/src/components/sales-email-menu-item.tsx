import { SalesType } from "@/app/(clean-code)/(sales)/types";
import {
    useSalesEmailSender,
    useSalesMailer,
} from "@/hooks/use-sales-email-sender";

import { Menu } from "./(clean-code)/menu";
import { useTaskTrigger } from "@/hooks/use-task-trigger";
import { SendSalesEmailPayload } from "@jobs/schema";

export function SalesEmailMenuItem({
    salesId,
    orderNo,
    salesType,
    asChild = false,
    menuRef,
}: {
    salesId?;
    salesType: SalesType;
    asChild?: boolean;
    orderNo?;
    menuRef?;
}) {
    const isQuote = salesType === "quote";
    const { params, setParams: setMailParams } = useSalesEmailSender();
    const ctx = useSalesMailer();
    const trig = useTaskTrigger({
        executingToast: "Sending email...",
        errorToast: "Failed",
        successToast: "Sent!",
        debug: true,
        onSucces(e) {
            menuRef?.current?._onOpenChanged(false);
        },
        onError(e) {
            menuRef?.current?._onOpenChanged(false);
        },
    });
    const sendInvoiceEmail = async ({
        withPayment = false,
        partPayment = false,
    } = {}) => {
        const fn = () =>
            trig.trigger({
                taskName: "send-sales-email",
                // taskName: "update-sales-control",
                payload: {
                    emailType: withPayment
                        ? "with payment"
                        : partPayment
                          ? "with part payment"
                          : "without payment",
                    printType: isQuote ? "quote" : "order",
                    salesIds: [salesId],
                } as SendSalesEmailPayload,
            });
        fn();
        // if (menuRef) menuRef.current.run(fn);
        // else fn();
        // ctx.send({
        //     emailType: withPayment
        //         ? "with payment"
        //         : partPayment
        //           ? "with part payment"
        //           : "without payment",
        //     printType: isQuote ? "quote" : "order",
        //     salesIds: [salesId],
        // });
        // setMailParams({
        //     withPayment,
        //     partPayment,
        //     sendEmailSalesIds: Array.isArray(salesId)
        //         ? salesId
        //         : salesId
        //           ? [salesId]
        //           : null,
        //     sendEmailSalesNos: Array.isArray(orderNo)
        //         ? orderNo
        //         : orderNo
        //           ? [orderNo]
        //           : null,
        // });
    };

    const emailLabel = `${isQuote ? "Quote" : "Invoice"} Email`;

    const emailMenuItem = (
        <>
            <Menu.Item onClick={() => sendInvoiceEmail({ withPayment: false })}>
                {emailLabel}
            </Menu.Item>
            {isQuote || (
                <>
                    <Menu.Item
                        onClick={(e) => {
                            e.preventDefault();
                            sendInvoiceEmail({ withPayment: true });
                        }}
                    >
                        Payment Link
                    </Menu.Item>
                    <Menu.Item
                        disabled
                        onClick={() =>
                            sendInvoiceEmail({
                                withPayment: true,
                                partPayment: true,
                            })
                        }
                    >
                        Part Payment Link
                    </Menu.Item>
                </>
            )}
            <Menu.Item disabled>Reminder Email</Menu.Item>
        </>
    );

    if (asChild) {
        return <>{emailMenuItem}</>;
    }

    return (
        <Menu.Item
            disabled={!salesId}
            icon="Email"
            SubMenu={<>{emailMenuItem}</>}
        >
            Email
        </Menu.Item>
    );
}
