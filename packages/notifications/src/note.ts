import { NoteTagTypes } from "@gnd/utils/constants";
import { Db } from "@gnd/db";
import { TagFilters } from "./utils";
import { getSubscriberAccount } from "./channel-subscribers";

interface CreateNoteData {
  type?: NoteTagTypes;
  headline?: string;
  subject?: string;
  note: string;
  status?: string;
  tags: TagFilters[];
  eventDate?: string;
  db: Db;
  //   author: {
  //     name: string;
  //     email: string;
  //     phoneNo: string;
  //     id: number;
  //   };
  authorId: number;
}
export async function createNoteAction(props: CreateNoteData) {
  const { authorId, db, ...data } = props;
  const auth = await db.users.findFirstOrThrow({
    where: { id: authorId },
  });
  //   const auth = data.author;
  const senderContactId = (await getSubscriberAccount(db, auth.id))?.id!;
  const note = await db.notePad.create({
    data: {
      // type: data.type,
      headline: data.headline,
      note: data.note,
      subject: data.subject,

      // status: "public",
      senderContact: {
        connect: {
          id: senderContactId,
        },
      },
      // readReceipts
      events: data.eventDate
        ? {
            create: {
              eventDate: data.eventDate,
            },
          }
        : undefined,
      tags: {
        createMany: {
          data: data.tags.map((tag) => {
            return tag;
          }),
        },
      },
    },
    include: {
      tags: true,
      events: true,
    },
  });

  return note;
}
