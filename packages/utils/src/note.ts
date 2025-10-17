import { noteTagNames, NoteTagNames } from "./constants";
import { z } from "zod";
export const noteTag = (tagName: NoteTagNames, tagValue) => ({
  tagName,
  tagValue: String(tagValue),
});
export const composeNote = () => {
  const set = (k: keyof SaveNoteSchema, value) => {
    ctx.data[k] = value;
    return ctx;
  };
  const ctx = {
    data: {} as SaveNoteSchema,
    set,
    color: (str) => {
      ctx.data.noteColor = str;
      return ctx;
    },
  };
  return ctx;
};
export async function getSenderId(db, authId) {
  const user = await db.users.findUnique({
    where: {
      id: authId,
    },
    select: {
      name: true,
      phoneNo: true,
      email: true,
    },
  });
  if (!user) throw new Error("Unauthorized!");
  const { name, phoneNo, email } = user;
  const senderContactId = (
    await db.notePadContacts.upsert({
      where: {
        name_email_phoneNo: {
          email: email,
          name: name as any,
          phoneNo: phoneNo as any,
        },
      },
      update: {},
      create: {
        email: email,
        name: name as any,
        phoneNo: phoneNo,
      },
    })
  ).id;
  return senderContactId;
}
export const saveNoteSchema = z.object({
  note: z.string(),
  headline: z.string().describe("The main content of the note"),
  subject: z.string(),
  noteColor: z.string().optional().nullable(),
  tags: z.array(
    z.object({
      tagName: z.enum(noteTagNames),
      tagValue: z.string(),
    })
  ),
});
export type SaveNoteSchema = z.infer<typeof saveNoteSchema>;

export async function saveNote(db, data: SaveNoteSchema, authId) {
  const senderId = await getSenderId(db, authId);
  const note = await db.notePad.create({
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
  return note;
}
export type Note = ReturnType<typeof transformNote>;
export function transformNote(_note) {
  const { tags, id, headline, subject, color, note, createdAt, ...data } =
    (_note as any) || {};
  const tag: { [k in NoteTagNames]: { id; value } } = {} as any;
  tags?.map((t) => {
    tag[t.tagName] = {
      id: t.id,
      value: t.tagValue,
    };
  });
  return {
    headline,
    subject,
    note,
    createdAt,
    color,
    tag,
  };
}
