import { Db } from "@gnd/db";

export interface SiteTicketProps {
  type: ActionTicketType;
  event: ActionTicketEvents;
  meta?: ActionTicketMeta;
  authorId?: number;
}
type Author = { id: number; name: string };
export async function createSiteActionTicket(
  // description,type: ActionTicketType,
  // meta: ActionTicketMeta
  db: Db,
  props: SiteTicketProps,
) {
  const author = await db.users.findUniqueOrThrow({
    where: {
      id: props.authorId!,
    },
    select: {
      id: true,
      name: true,
    },
  });
  let { meta } = props;
  if (!meta) meta = {};
  //   const auth = await user();
  meta.authorName = author.name;
  meta.authorId = author.id;
  await db.siteActionTicket.create({
    data: {
      description: await generateDescription(author, props),
      type: props.type,
      event: props.event,
      meta,
      SiteActionNotification: {
        create: {
          event: `${props.type}-${props.event}`,
        },
      },
    },
  });
}

async function generateDescription(
  auth: Author,
  { type, event }: SiteTicketProps,
) {
  return [type, event, "by", auth.name].join(" ").replaceAll("-", " ");
  switch (type) {
    case "sales-customer-transaction":
      break;
  }
}

export const actionTicketTypes = [
  "sales-customer-transaction",
  "sales-payment",
  "sales-labor-cost",
  "employee-role",
  "employee-profile",
  "order",
  "quote",
] as const;
export const actionTicketEvents = [
  "deleted",
  "created",
  "edited",
  "restored",
  "cancelled",
] as const;
export type ActionTicketType = (typeof actionTicketTypes)[number];
export type ActionTicketEvents = (typeof actionTicketEvents)[number];

export interface ActionTicketMeta {
  id?: string | number;
  authorName?: string;
  authorId?: number;
  description?: string;
}
