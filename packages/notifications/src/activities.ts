import { Db } from "@gnd/db";
import { CreateActivityInput } from "./schemas";

const activityTypes = ["sales_checkout_success"] as const;
const activityStatus = [] as const;
// type CreateActivityParams = {
//   //   teamId: string;
//   userId?: number;
//   type: (typeof activityTypes)[number];
//   source: "system" | "user";
//   // status?: (typeof activityStatus)[number];
//   priority?: number;
//   groupId?: string;
//   tags: Record<string, any>;
// };
export async function createActivity(db: Db, params: CreateActivityInput) {
  const auth = await db.users.findFirstOrThrow({
    where: { id: params.authorId },
  });
  const senderId = await getContactId(db, auth);
  const recipientIds = await getReceipientIds(db, ...(params.userIds || []));
  const tags = {
    ...params.tags,
    type: params.type,
    source: params.source,
    priority: params.priority,
    sendEmail: params.sendEmail,
  };
  const activity = await db.notePad.create({
    data: {
      subject: params.subject,
      headline: params.headline,
      note: params.note,
      senderContact: {
        connect: {
          id: senderId,
        },
      },
      recipients: {
        connect: recipientIds.map((contactId) => ({
          id: contactId,
        })),
      },
      // readReceipts: {
      //   create: recipientIds.map((contactId) => ({
      //     contact: {
      //       connect: {
      //         id: contactId,
      //       },
      //     },
      //     // status: "unread",
      //   })),
      // },
      tags: {
        createMany: {
          data: Object.entries(tags).map(([tagName, tagValue]) => ({
            tagName,
            tagValue: String(tagValue),
            //  key: tagName,
            //  value: JSON.stringify(tagValue),
          })),
        },
      },
    },
  });
}
const getReceipientIds = async (db: Db, ...userIds) => {
  const recipients = await db.users.findMany({
    where: {
      id: {
        in: userIds,
      },
    },
  });
  return await Promise.all(
    recipients.map(async (recipient) => {
      const contactId = await getContactId(db, recipient);
      return contactId;
    }),
  );
};
const getContactId = async (db: Db, { email, name, phoneNo }) => {
  const senderContactId = (
    await db.notePadContacts.upsert({
      where: {
        name_email_phoneNo: {
          email: email,
          name: name!,
          phoneNo: phoneNo!,
        },
      },
      update: {},
      create: {
        email: email,
        name: name!,
        phoneNo: phoneNo,
      },
    })
  ).id;
  return senderContactId;
};

export async function updateActivityStatus(
  db: Db,
  activityId: string,
  status: (typeof activityStatus)[number],
  teamId: string,
) {}
export async function updateAllActivitiesStatus(
  db: Db,
  teamId: string,
  status: (typeof activityStatus)[number],
  options: { userId: string },
) {}

export type UpdateActivityMetadataParams = {
  activityId: string;
  //   teamId: string;
  metadata: Record<string, any>;
};
export async function updateActivityMetadata(
  db: Db,
  params: UpdateActivityMetadataParams,
) {
  return true;
}
