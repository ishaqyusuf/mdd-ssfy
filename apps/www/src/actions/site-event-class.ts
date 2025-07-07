import { ActionTicketMeta } from "@/app/(clean-code)/type";
import { actionTicketEvents, actionTicketTypes } from "@/utils/constants";
import { createSiteActionTicket } from "./create-site-action-ticket";

type ActionTicketType = (typeof actionTicketTypes)[number];
type ActionTicketEvents = (typeof actionTicketEvents)[number];
export interface SiteTicketProps {
    type: ActionTicketType;
    event: ActionTicketEvents;
    meta?: ActionTicketMeta;
}
export class SiteEvent {
    #data: SiteTicketProps;
    constructor(params?: SiteTicketProps) {
        this.#data = params || ({} as any);
    }
    type(type: ActionTicketType) {
        this.#data.type = type;
        return this;
    }
    event(event: ActionTicketEvents) {
        this.#data.event = event;
        return this;
    }
    async create() {
        return await createSiteActionTicket(this.#data);
    }
}
