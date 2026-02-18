import { ContactRole, Db, NoteStatus } from "@gnd/db";
import { CreateActivityInput } from "./schemas";
import { UserData } from "./base";
import { getSubscriberAccount } from "./channel-subscribers";

// const activityTypes = ["sales_checkout_success"] as const;
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
export async function createActivity(
  db: Db,
  params: CreateActivityInput,
  authorId?: number,
  recipientIds?: number[],
) {
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
          id: authorId,
        },
      },
      recipients: !recipientIds?.length
        ? undefined
        : {
            createMany: {
              data: recipientIds.map((notePadContactId) => ({
                notePadContactId,
                status: "unread",
              })),
            },
            // connect: recipientIds?.map((contactId) => ({
            //   id: contactId,
            // })),
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
  return activity;
}
export type GetActivitiesParams = {
  contactIds: number[];
  status?: NoteStatus;
};
export async function getActivties(db: Db, params: GetActivitiesParams) {
  const { contactIds, status } = params;
  const activities = await db.notePad.findMany({
    where: {
      recipients: {
        some: {
          notePadContactId: {
            in: contactIds,
          },
          ...(status ? { status } : {}),
        },
      },
    },
    select: {
      id: true,
      subject: true,
      headline: true,
      note: true,
      senderContact: {
        select: {
          id: true,
          // name: true,
          // email: true,
        },
      },
      tags: {
        select: {
          tagName: true,
          tagValue: true,
        },
      },
      recipients: {
        where: {
          notePadContactId: {
            in: contactIds,
          },
        },
        select: {
          status: true,
          notePadContactId: true,
        },
      },
    },
  });
  return activities.map(({ tags, recipients, ...activity }) => {
    return {
      ...activity,
      receipt: recipients[0],
      tags: tags.reduce(
        (acc, { tagName, tagValue }) => {
          acc[tagName] = tagValue;
          return acc;
        },
        {} as Record<string, any>,
      ),
    };
  });
}
export const getContactsByUserIds = async (
  db: Db,
  userIdType: ContactRole,
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
            id: true,
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
          id: true,
          email: true,
          name: true,
          phoneNo: true,
        },
      });
  return await Promise.all(
    recipients.map(async (recipient) => {
      const contact = await getContact(db, recipient as any);
      return contact;
    }),
  );
};
export const getContactIdsByUserIds = async (
  db: Db,
  // isCustomer: boolean,
  userIdType: ContactRole,
  userIds: number[],
) => {
  const contacts = await getContactsByUserIds(db, userIdType, userIds);
  return contacts.map((contact) => contact.id);
};
export const getContact = async (
  db: Db,
  {
    email,
    name,
    phoneNo,
    id,
  }: {
    id?: number;
    email: string;
    name?: string;
    phoneNo?: string;
  },
  role: ContactRole = "employee",
): Promise<UserData> => {
  return (await getSubscriberAccount(db, id!, role)) as UserData;
};
export const getContactId = async (
  db: Db,
  { email, name, phoneNo }: { email: string; name?: string; phoneNo?: string },
) => {
  return (await getContact(db, { email, name, phoneNo }))?.id;
};

export async function updateActivityStatus(
  db: Db,
  activityId: number,
  status: NoteStatus,
  notePadContactId: number,
) {
  await db.noteRecipients.updateMany({
    where: {
      notePadId: activityId,
      notePadContactId,
    },
    data: {
      status,
    },
  });
}
export async function updateAllActivitiesStatus(
  db: Db,
  teamId: string,
  status: NoteStatus,
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
export async function getChannelSubcribers(
  db: Db,
  channelName: string,
): Promise<UserData[]> {
  const channel = await db.noteChannels.findFirst({
    where: {
      channelName,
    },
    select: {
      assignedUsers: {
        select: {
          id: true,
          contact: {
            select: {
              id: true,
              // email: true,
              // name: true,
              profileId: true,
            },
          },
        },
      },
      noteChannelRoles: {
        select: {
          role: {
            select: {
              id: true,
            },
          },
        },
      },
    },
  });
  // get all users in roles that have access to the channel.
  const users = await db.users.findMany({
    where: {
      roles: {
        some: {
          roleId: {
            in: (
              channel?.noteChannelRoles.map((ncr) => ncr.role?.id) || []
            ).filter((id): id is number => !!id),
          },
        },
      },
    },
    select: {
      id: true,
      email: true,
      name: true,
      phoneNo: true,
    },
  });
  const contacts = [
    ...(channel?.assignedUsers.map((au) => au.contact) || []),
    ...(await db.notePadContacts.findMany({
      where: {
        profileId: {
          in: users.map((u) => u.id),
        },
        role: "employee",
      },
      select: {
        id: true,
        // email: true,
        // name: true,
        profileId: true,
      },
    })),
  ];
  const usersWithNoContact = users.filter(
    (user) => !contacts.some((contact) => contact!.profileId === user.id),
  );
  const contactsFromUsersWithNoContact = await Promise.all(
    usersWithNoContact.map(async (user) => {
      return await getContact(
        db,
        {
          email: user.email,
          name: user.name!,
          id: user.id,
          phoneNo: user.phoneNo!,
        },
        "employee",
      );
    }),
  );
  return [...contacts, ...contactsFromUsersWithNoContact].filter(
    Boolean,
  ) as UserData[];
}
