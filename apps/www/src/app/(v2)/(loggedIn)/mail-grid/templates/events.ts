export const emailTriggerEvents = [
    "DEALERSHIP_APPROVED",
    "DEALERSHIP_REJECTED",
    "DEALERSHIP_REGISTRATION_SUBMITTED",

    "SALES_CREATED",
    "QUOTE_CREATED",
    "SALES_UPDATED",
    "QUOTE_UPDATED",

    "SALES_EVALUATED",
    "QUOTE_EVALUATED",

    "SALES_PRODUCTION_ASSIGNED",
    "SALES_PRODUCTION_STARTED",
    "SALES_PRODUCTION_COMPLETED",

    "PAYMENT_LINK_CREATED",
    "PAYMENT_LINK_DESTROYED",
    "PAYMENT_SUCCESSFUL",
    "PAYMENT_SUCCESSFUL_WITH_TIPS",
    "PAYMENT_FAILED",
] as const;
export type EmailTriggerEventType = (typeof emailTriggerEvents)[number];
export const eventRecipients = [
    "CUSTOMER_EMAIL",
    "DEALER_EMAIL",
    "SALES_REP",
    "ADMIN",
    "PRODUCTION_WORKER",
] as const;
export type EventReceipientTypes = (typeof eventRecipients)[number];

export function getTriggerEmailReceivers(event: EmailTriggerEventType) {
    let recipients: EventReceipientTypes[] = [];
    switch (event) {
        case "DEALERSHIP_APPROVED":
        case "DEALERSHIP_REJECTED":
        case "DEALERSHIP_REGISTRATION_SUBMITTED":
            recipients.push("ADMIN");
            recipients.push("DEALER_EMAIL");
        case "SALES_CREATED":
        case "QUOTE_CREATED":
        case "QUOTE_UPDATED":
        case "SALES_UPDATED":
            recipients.push("ADMIN");
            recipients.push("SALES_REP");
            recipients.push("CUSTOMER_EMAIL");
        case "SALES_PRODUCTION_ASSIGNED":
        case "SALES_PRODUCTION_COMPLETED":
        case "SALES_PRODUCTION_STARTED":
            recipients.push("ADMIN");
            recipients.push("SALES_REP");
            recipients.push("CUSTOMER_EMAIL");
            recipients.push("PRODUCTION_WORKER");
    }
    return recipients;
}
// export function _lorem(type: EmailTriggerEventType){}
//  _lorem('')
