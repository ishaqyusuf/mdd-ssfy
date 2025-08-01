import type { SaveInboundNoteSchema, SaveNoteSchema } from "@api/schemas/notes";
import type { TRPCContext } from "@api/trpc/init";
import { getAuthUser } from "./user";
import type { NoteTagNames } from "@gnd/utils/constants";

export async function saveNote(ctx: TRPCContext, data: SaveNoteSchema) {
  const senderId = await getSenderId(ctx);
  const note = await ctx.db.notePad.create({
    data: {
      headline: data.headline,
      subject: data.subject,
      note: `${data.note}`,
      color: data.noteColor,
      senderContact: {
        connect: {
          id: senderId,
        },
      },
      tags: {
        createMany: {
          data: data.tags,
        },
      },
    },
  });
}
export async function saveInboundNote(
  ctx: TRPCContext,
  data: SaveInboundNoteSchema
) {
  const senderId = await getSenderId(ctx);
  const note = await ctx.db.notePad.create({
    data: {
      headline: `Sales Inbound`,
      subject: `${data.status}`,
      note: `${data.note}`,
      color: data.noteColor,
      senderContact: {
        connect: {
          id: senderId,
        },
      },
      tags: {
        createMany: {
          data: [
            {
              tagName: "salesId" as NoteTagNames,
              tagValue: `${data.salesId}`,
            },
            {
              tagName: "inboundStatus" as NoteTagNames,
              tagValue: `${data.status}`,
            },
            {
              tagName: "type" as NoteTagNames,
              tagValue: "inbound",
            },
            ...(data?.attachments || [])?.map(({ pathname: tagValue }) => ({
              tagValue,
              tagName: "attachment" as NoteTagNames,
            })),
          ],
        },
      },
    },
  });
}

export async function getSenderId(ctx: TRPCContext) {
  const user = await getAuthUser(ctx);
  if (!user) throw new Error("Unauthorized!");
  const senderContactId = (
    await ctx.db.notePadContacts.upsert({
      where: {
        name_email_phoneNo: {
          email: user.email,
          name: user.name as any,
          phoneNo: user.phoneNo as any,
        },
      },
      update: {},
      create: {
        email: user.email,
        name: user.name as any,
        phoneNo: user.phoneNo,
      },
    })
  ).id;
  return senderContactId;
}
