"use client";

import { Chat, useChat } from "../chat";
import { Inbox } from "../inbox";

const channelNames = [
    "sales_info",
    // "simple_sales_email_reminder"
] as const;

const paymentLinkOptions = [
    { label: "None", value: "none" },
    { label: "25%", value: "25" },
    { label: "50%", value: "50" },
    { label: "75%", value: "75" },
    { label: "Yes", value: "full" },
];

const invoiceDownloadOptions = [
    { label: "Yes", value: "yes" },
    { label: "No", value: "no" },
];

const defaultPayloads = {
    simple_sales_email_reminder: {
        paymentLinkOption: "none",
        invoiceDownload: "no",
    },
};

function SalesInboxComposer() {
    const chat = useChat();
    const isReminderChannel =
        chat.state.channel === "simple_sales_email_reminder";

    return (
        <>
            <Chat.Header>
                <Chat.ChannelsOption names={channelNames} />
            </Chat.Header>

            <Chat.Content
                placeholder={
                    isReminderChannel
                        ? "Add internal note for this reminder (optional)..."
                        : "Write a sales activity note..."
                }
            />
            <Chat.Footer>
                <Chat.ColorPicker />
                <Chat.PayloadOption
                    show={isReminderChannel}
                    required={isReminderChannel}
                    name="paymentLinkOption"
                    label="payment link"
                    options={paymentLinkOptions}
                />
                <Chat.PayloadOption
                    show={isReminderChannel}
                    required={isReminderChannel}
                    name="invoiceDownload"
                    label="invoice pdf"
                    options={invoiceDownloadOptions}
                />
                <div className="flex-1" />
                <Chat.SendButton
                    label={isReminderChannel ? "Send reminder" : "Send note"}
                />
            </Chat.Footer>
        </>
    );
}

type SalesOverviewInboxProps = {
    saleData: any;
};

export function SalesOverviewInbox({ saleData }: SalesOverviewInboxProps) {
    if (!saleData?.id) return null;

    return (
        <Inbox
            activityHistoryProps={{
                emptyText: null,
                tags: [
                    {
                        tagName: "salesId",
                        tagValue: saleData.id,
                    },
                ],
            }}
            chatProps={{
                channel: "sales_info",
                names: channelNames,
                payload: {
                    salesId: saleData.id,
                    salesNo: saleData.orderId,
                },
                defaultPayloads,
                transformSubmitData: async (payload) => {
                    const paymentLinkOption = payload.paymentLinkOption;
                    const invoiceDownload = payload.invoiceDownload;
                    const isReminderTransform =
                        typeof paymentLinkOption === "string" ||
                        typeof invoiceDownload === "string";

                    if (!isReminderTransform || !saleData?.id) {
                        return {};
                    }

                    const payPlanMap: Record<
                        string,
                        25 | 50 | 75 | 100 | null
                    > = {
                        none: null,
                        "25": 25,
                        "50": 50,
                        "75": 75,
                        full: 100,
                    };

                    return {
                        salesId: saleData.id,
                        payPlan: payPlanMap[paymentLinkOption] ?? null,
                        attachInvoice: invoiceDownload === "yes",
                    };
                },
                placeholder: "Write a sales activity note...",
            }}
        >
            <SalesInboxComposer />
        </Inbox>
    );
}

