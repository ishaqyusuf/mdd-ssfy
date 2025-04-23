import { __sendInvoiceEmailTrigger } from "@/actions/triggers/send-invoice-email";
import { SalesType } from "@/app/(clean-code)/(sales)/types";
import { useLoadingToast } from "@/hooks/use-loading-toast";
import { useSalesEmailSender } from "@/hooks/use-sales-email-sender";
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
    orderNo?: string;
}) {
    const isQuote = salesType === "quote";
    const loadingToast = useLoadingToast();
    const mailSender = useSalesEmailSender();
    const sendInvoiceEmail = async ({ withPayment = false } = {}) => {
        loadingToast.display({
            variant: "spinner",
            title: "Sending Email...",
            duration: Number.POSITIVE_INFINITY,
        });

        __sendInvoiceEmailTrigger({
            ids: salesId,
            orderIds: orderNo,
            withPayment,
        })
            .catch((e) => {
                loadingToast.error("Unable to complete");
            })
            .then((a) => {
                loadingToast.success("Unable to complete");
            });
    };

    const emailLabel = `${isQuote ? "Quote" : "Invoice"} Email`;

    const emailMenuItem = (
        <>
            <Menu.Item onClick={() => sendInvoiceEmail({ withPayment: false })}>
                {emailLabel}
            </Menu.Item>
            {isQuote || (
                <Menu.Item
                    onClick={() => sendInvoiceEmail({ withPayment: true })}
                >
                    With Payment Link
                </Menu.Item>
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
