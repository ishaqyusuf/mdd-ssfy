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
  const recipientIds = await getContactIdsByUserIds(
    db,
    params.userIdType,
    params.userIds || [],
  );
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
export const getContactsByUserIds = async (
  db: Db,
  userIdType: "user" | "customer",
  userIds: number[],
) => {
  const isCustomer = userIdType === "customer";
  const recipients = isCustomer
    ? (
        await db.customers.findMany({
          where: {
            id: {
              in: userIds,
            },
          },
          select: {
            email: true,
            name: true,
            phoneNo: true,
            businessName: true,
          },
        })
      )?.map(({ email, name, phoneNo, businessName }) => ({
        email,
        name: businessName || name,
        phoneNo,
      }))
    : await db.users.findMany({
        where: {
          id: {
            in: userIds,
          },
        },
        select: {
          email: true,
          name: true,
          phoneNo: true,
        },
      });
  return await Promise.all(
    recipients.map(async (recipient) => {
      const contact = await getContact(db, recipient);
      return contact;
    }),
  );
};
export const getContactIdsByUserIds = async (
  db: Db,
  // isCustomer: boolean,
  userIdType: "user" | "customer",
  userIds: number[],
) => {
  const contacts = await getContactsByUserIds(db, userIdType, userIds);
  return contacts.map((contact) => contact.id);
};
export const getContact = async (db: Db, { email, name, phoneNo }) => {
  const contact = await db.notePadContacts.upsert({
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
  });

  return contact;
};
export const getContactId = async (db: Db, { email, name, phoneNo }) => {
  return (await getContact(db, { email, name, phoneNo }))?.id;
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

export async function shouldSendNotification(
  db: Db,
  contactId: number,
  notificationType: string,
  channel: "email" | "inbox" | "in_app",
) {
  return true;
}
