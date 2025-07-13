import { SalesType } from "@/app/(clean-code)/(sales)/types";
import { useLoadingToast } from "@/hooks/use-loading-toast";
import {
    useSalesEmailSender,
    useSalesMailer,
} from "@/hooks/use-sales-email-sender";
import { toast } from "sonner";

import { Menu } from "./(clean-code)/menu";

export function SalesEmailMenuItem({
    salesId,
    orderNo,
    salesType,
    asChild = false,
}: {
    salesId?;
    salesType: SalesType;
    asChild?: boolean;
    orderNo?;
}) {
    const isQuote = salesType === "quote";
    const { params, setParams: setMailParams } = useSalesEmailSender();
    const ctx = useSalesMailer();
    const sendInvoiceEmail = async ({
        withPayment = false,
        partPayment = false,
    } = {}) => {
        ctx.send({
            emailType: withPayment
                ? "with payment"
                : partPayment
                  ? "with part payment"
                  : "without payment",
            printType: isQuote ? "quote" : "order",
            salesIds: [salesId],
        });
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
                        onClick={() => sendInvoiceEmail({ withPayment: true })}
                    >
                        Payment Link
                    </Menu.Item>
                    <Menu.Item
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
