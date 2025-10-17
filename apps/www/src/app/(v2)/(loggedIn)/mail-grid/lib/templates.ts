import { env } from "@/env.mjs";
import { EmailTriggerEventType } from "../templates/events";
interface MailProps {
    subject: string;
    body: string;
    to?: any;
    from?: any;
    mailType?: string;
    attachments?: any;
}
type EmailTemplate = {
    [event in EmailTriggerEventType]: MailProps;
};

export function composeEmail(event: EmailTriggerEventType, data) {
    const template = emailTemplates[event];
    if (!template) return null;
}

export const transformer = (data, mail: MailProps) => {
    const trans = {
        "@yourCompanyName": '<a href="https://gndprodesk.com">GND Millwork</a>',
        "@customerName": data.customerName,
        "@orderId": `#${data.orderId}`,
        "@paymentLink": `<a href="${data.paymentLink}">Payment Link</a>`,
        "@quoteLink": `<a href="${data.quoteLink}">Quote Link</a>`,
    };

    Object.entries(trans).forEach(([key, value]) => {
        mail.subject = mail.subject.replaceAll(key, value);
        mail.body = mail.body.replaceAll(key, value);
        // mail.to = mail.to?.replaceAll(key, value);
        mail.to = data.email;
        if (env.NODE_ENV == "development")
            mail.to = [`ishaqyusuf024@gmail.com`, `pcruz321@gmail.com`];
    });
    return mail;
};
export const emailTemplates: Partial<EmailTemplate> = {
    DEALERSHIP_APPROVED: {
        subject: "Your Dealership Has Been Approved",
        body: `
        Dear @customerName,<br/>
        Congratulations! Your dealership registration has been approved.<br/>
        You can now access your account and start managing your dealership.<br/>
        Best regards,<br/>
        @yourCompanyName
        `,
        to: "@email",
    },
    DEALERSHIP_REJECTED: {
        subject: "Your Dealership Registration Was Rejected",
        body: `
        Dear @customerName,<br/>
        Unfortunately, your dealership registration has been rejected.<br/>
        If you have any questions or would like to appeal this decision, please contact us.<br/>
        Best regards,<br/>
        @yourCompanyName
        `,
        to: "@email",
    },
    DEALERSHIP_REGISTRATION_SUBMITTED: {
        subject: "Your Dealership Registration Has Been Submitted",
        body: `
        Dear @customerName,<br/>
        Thank you for submitting your dealership registration.<br/>
        Our team will review your application and get back to you shortly.<br/>
        Best regards,<br/>
        @yourCompanyName
        `,
        to: "@email",
    },
    SALES_CREATED: {
        subject: "New Sales Record Created",
        body: `
        Dear @customerName,<br/>
        A new sales record has been created for your order @orderId.<br/>
        You can view the details in your account.<br/>
        Best regards,<br/>
        @yourCompanyName
        `,
        to: "@email",
    },
    QUOTE_CREATED: {
        subject: "New Quote Created",
        body: `
        Dear @customerName,<br/>
        A new quote has been created for your order @orderId.<br/>
        You can review the quote and approve it using the link below:<br/>
        @quoteLink<br/>
        Best regards,<br/>
        @yourCompanyName
        `,
        to: "@email",
    },
    SALES_UPDATED: {
        subject: "Sales Record Updated",
        body: `
        Dear @customerName,<br/>
        Your sales record for order @orderId has been updated.<br/>
        Please check your account for the latest details.<br/>
        Best regards,<br/>
        @yourCompanyName
        `,
        to: "@email",
    },
    QUOTE_UPDATED: {
        subject: "Quote Updated",
        body: `
        Dear @customerName,<br/>
        The quote for your order @orderId has been updated.<br/>
        You can review the updated quote using the link below:<br/>
        @quoteLink<br/>
        Best regards,<br/>
        @yourCompanyName
        `,
        to: "@email",
    },
    SALES_EVALUATED: {
        subject: "Sales Record Evaluated",
        body: `
        Dear @customerName,<br/>
        Your sales record for order @orderId has been evaluated.<br/>
        Please check your account for further details.<br/>
        Best regards,<br/>
        @yourCompanyName
        `,
        to: "@email",
    },
    QUOTE_EVALUATED: {
        subject: "Quote Evaluated",
        body: `
        Dear @customerName,<br/>
        The quote for your order @orderId has been evaluated.<br/>
        You can review it using the link below:<br/>
        @quoteLink<br/>
        Best regards,<br/>
        @yourCompanyName
        `,
        to: "@email",
    },
    SALES_PRODUCTION_ASSIGNED: {
        subject: "Production Has Been Assigned",
        body: `
        Dear @customerName,<br/>
        Your sales order @orderId has been assigned to production.<br/>
        Our team is working hard to fulfill your order.<br/>
        Best regards,<br/>
        @yourCompanyName
        `,
        to: "@email",
    },
    SALES_PRODUCTION_STARTED: {
        subject: "Production Has Started",
        body: `
        Dear @customerName,<br/>
        Production for your sales order @orderId has begun.<br/>
        We will keep you updated on its progress.<br/>
        Best regards,<br/>
        @yourCompanyName
        `,
        to: "@email",
    },
    SALES_PRODUCTION_COMPLETED: {
        subject: "Production Completed",
        body: `
        Dear @customerName,<br/>
        The production for your order @orderId has been completed.<br/>
        You will receive further instructions for delivery soon.<br/>
        Best regards,<br/>
        @yourCompanyName
        `,
        to: "@email",
    },
    PAYMENT_LINK_CREATED: {
        subject: "Your Order Payment Link is Ready",
        body: `
        Dear @customerName,<br/>
        Your order is now ready for payment. Please use the link below to complete your transaction:<br/>
        @paymentLink<br/>
        If you have any questions or need assistance, feel free to reach out to us.<br/>
        Best regards,<br/>
        @yourCompanyName
        `,
        to: "@email",
    },
    PAYMENT_LINK_DESTROYED: {
        subject: "Your Payment Link Has Been Canceled",
        body: `
        Dear @customerName,<br/>
        The payment link for your order @orderId has been deleted by our admin.<br/>
        If you have any questions, please contact us.<br/>
        Best regards,<br/>
        @yourCompanyName
        `,
        to: "@email",
    },
    PAYMENT_SUCCESSFUL: {
        subject: "Payment Received - Thank You!",
        body: `
        Dear @customerName,<br/>
        We are pleased to inform you that your payment for order @orderId has been successfully processed.<br/>
        Thank you for your prompt payment.<br/>
        Best regards,<br/>
        @yourCompanyName
        `,
        to: "@email",
    },
    PAYMENT_SUCCESSFUL_WITH_TIPS: {
        subject: "Payment and Tip Received - Thank You!",
        body: `
        Dear @customerName,<br/>
        We have successfully processed your payment and tip for order @orderId.<br/>
        Thank you for your generosity!<br/>
        Best regards,<br/>
        @yourCompanyName
        `,
        to: "@email",
    },
    PAYMENT_FAILED: {
        subject: "Payment Failure Notice for Your Order",
        body: `
        Dear @customerName,<br/>
        Unfortunately, your payment attempt for order @orderId was unsuccessful.<br/>
        Please try again using the link below:<br/>
        @paymentLink<br/>
        If you encounter any issues, please contact our support team.<br/>
        Best regards,<br/>
        @yourCompanyName
        `,
        to: "@email",
    },
};
