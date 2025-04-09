import {
    ActionTicketEvents,
    ActionTicketMeta,
    ActionTicketType,
} from "@/app/(clean-code)/type";
import { user } from "@/app/(v1)/_actions/utils";
import { prisma } from "@/db";

interface Props {
    type: ActionTicketType;
    event: ActionTicketEvents;
    meta?: ActionTicketMeta;
}
export async function createSiteActionTicket(
    // description,type: ActionTicketType,
    // meta: ActionTicketMeta
    props: Props,
) {
    const { meta = {} } = props;
    const auth = await user();
    meta.authorName = auth.name;
    meta.authorId = auth.id;
    await prisma.siteActionTicket.create({
        data: {
            description: await generateDescription(props),
            type: props.type,
            event: props.event,
            meta,
        },
    });
}

async function generateDescription({ type, event }: Props) {
    const auth = await user();
    return [type, event, "by", auth.name].join(" ").replaceAll("-", " ");
    switch (type) {
        case "sales-customer-transaction":
            break;
    }
}
