import { Inbox } from "@/db";

export interface EmailProps extends Inbox {
    meta: {};
    reply_to?;
    attachOrder;
    data: any;
}
interface EmailModalProps {
    email: {
        toName?;
        toEmail?;
        type;
        parentId;
        data;
        reply_to;
        from;
    };
    data?;
    order?;
}
