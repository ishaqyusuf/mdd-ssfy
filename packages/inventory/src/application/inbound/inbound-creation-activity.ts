import type { Db, TransactionClient } from "@gnd/db";

export async function recordInboundCreation(db: Db | TransactionClient, inboundId: number, creatorUserId: number) {
 const creator = await db.users.findUniqueOrThrow({where: {id: creatorUserId}, select: {id: true, name: true}});
 const contact = await db.notePadContacts.findFirst({where: {role: "employee", profileId: creator.id, deletedAt: null}, select: {id: true, name: true}})
  ?? await db.notePadContacts.create({data: {role: "employee", profileId: creator.id, name: creator.name}, select: {id: true, name: true}});
 if (!contact.name && creator.name) await db.notePadContacts.update({where: {id: contact.id}, data: {name: creator.name}});
 await db.notePad.create({data: {
  subject: "Inbound created",
  headline: `${creator.name || `Employee #${creator.id}`} created inbound #${inboundId}.`,
  senderContactId: contact.id,
  tags: {createMany: {data: [
   {tagName: "inboundId", tagValue: String(inboundId)},
   {tagName: "activityType", tagValue: "created"},
   {tagName: "channel", tagValue: "inventory_inbound_activity"},
   {tagName: "type", tagValue: "system"},
   {tagName: "status", tagValue: "public"},
  ]}},
 }});
}
