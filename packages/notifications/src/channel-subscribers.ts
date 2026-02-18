import { Db } from "@gnd/db";
import { UserData } from "./base";

/**
 * Resolution chain:
 *
 *  NoteChannels (channelName = notificationType)
 *    └─ NoteChannelRole[]
 *         └─ Roles
 *              └─ ModelHasRoles (role → Users)
 *                   └─ Users
 *                        └─ NotePadContacts (role=employee, profileId=user.id)
 *                             │  [auto-created if missing]
 *                             └─ AssignedUserNoteChannel (per-channel prefs)
 *                                  └─ emailEnabled / inAppEnabled / whatsappEnabled
 */
export async function getSubscribersForNotificationType(
  db: Db,
  notificationType: string,
): Promise<UserData[]> {
  // ── 1. Find the channel matching the notification type ───────────────────
  const channel = await db.noteChannels.findUnique({
    where: { channelName: notificationType, deletedAt: null },
    include: {
      noteChannelRoles: {
        where: { deletedAt: null },
        include: {
          role: {
            include: {
              ModelHasRoles: {
                where: { deletedAt: null },
                include: {
                  user: {
                    select: {
                      id: true,
                      email: true,
                      deletedAt: true,
                      name: true,
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
  });

  if (!channel) return [];

  // ── 2. Collect unique active users from all roles on this channel ─────────
  const userMap = new Map<
    number,
    { id: number; email: string; name: string | null }
  >();

  for (const channelRole of channel.noteChannelRoles) {
    if (!channelRole.role) continue;
    for (const modelRole of channelRole.role.ModelHasRoles) {
      const user = modelRole.user;
      if (!user || user.deletedAt || userMap.has(user.id)) continue;
      userMap.set(user.id, { id: user.id, email: user.email, name: user.name });
    }
  }

  if (userMap.size === 0) return [];

  const users = Array.from(userMap.values());
  const userIds = users.map((u) => u.id);

  // ── 3. Fetch existing employee contacts for these users ───────────────────
  const existingContacts = await db.notePadContacts.findMany({
    where: {
      role: "employee",
      profileId: { in: userIds },
      deletedAt: null,
    },
    select: {
      id: true,
      profileId: true,
      assignedChannels: {
        where: { noteChannelId: channel.id },
        select: {
          emailEnabled: true,
          inAppEnabled: true,
          whatsappEnabled: true,
          textEnabled: true,
        },
      },
    },
  });

  // Index existing contacts by userId (profileId)
  const contactByUserId = new Map(
    existingContacts.map((c) => [c.profileId!, c]),
  );

  // ── 4. Auto-create contacts for users who don't have one ──────────────────
  const usersWithoutContact = users.filter((u) => !contactByUserId.has(u.id));

  if (usersWithoutContact.length > 0) {
    await Promise.all(
      usersWithoutContact.map(async (u) => {
        // Guard against a contact having been created between the first fetch and now
        const alreadyExists = await db.notePadContacts.findFirst({
          where: { role: "employee", profileId: u.id, deletedAt: null },
          select: { id: true },
        });
        if (alreadyExists) return;

        await db.notePadContacts.create({
          data: {
            // name: u.email,
            // email: u.email,
            role: "employee",
            profileId: u.id,
          },
        });
      }),
    );

    // Re-fetch newly created contacts
    const newContacts = await db.notePadContacts.findMany({
      where: {
        role: "employee",
        profileId: { in: usersWithoutContact.map((u) => u.id) },
        deletedAt: null,
      },
      select: {
        id: true,
        profileId: true,
        assignedChannels: {
          where: { noteChannelId: channel.id },
          select: {
            emailEnabled: true,
            inAppEnabled: true,
            whatsappEnabled: true,
            textEnabled: true,
          },
        },
      },
    });

    for (const c of newContacts) {
      if (c.profileId) contactByUserId.set(c.profileId, c);
    }
  }

  // ── 5. Build subscriber list ──────────────────────────────────────────────
  const subscribers: UserData[] = [];

  for (const user of users) {
    const contact = contactByUserId.get(user.id);
    if (!contact) continue;

    // AssignedUserNoteChannel holds per-contact per-channel preferences.
    // If no assignment row exists yet, fall back to the channel's own support flags.
    const prefs = contact.assignedChannels[0];

    subscribers.push({
      email: user.email,
      id: contact.id,
      profileId: user.id,
      name: user.name!,
      role: "employee",
      emailNotification: prefs?.emailEnabled ?? channel.emailSupport ?? false,
      inAppNotification: prefs?.inAppEnabled ?? channel.inAppSupport ?? false,
      whatsAppNotification:
        prefs?.whatsappEnabled ?? channel.whatsappSupport ?? false,
    });
  }

  return subscribers;
}

export async function getSubscriberAccount(
  db: Db,
  profileId: number,
  role: "employee" | "customer" = "employee",
): Promise<{
  id: number;
  profileId: number;
  name: string;
  email?: string;
  phoneNo?: string;
  role?: "employee" | "customer";
} | null> {
  // ── 1. Resolve email from the correct table ──────────────────────────────
  let email: string | null | undefined;
  let name: string | null | undefined;
  if (role === "employee") {
    const user = await db.users.findFirst({
      where: { id: profileId, deletedAt: null },
      select: { email: true, name: true },
    });
    email = user?.email;
    name = user?.name;
  } else {
    const customer = await db.customers.findFirst({
      where: { id: profileId, deletedAt: null },
      select: { email: true, name: true, businessName: true },
    });
    email = customer?.email;
    name = customer?.name || customer?.businessName;
  }

  if (!email) return null;

  // ── 3. Find or create the NotePadContact ─────────────────────────────────
  let contact = await db.notePadContacts.findFirst({
    where: { profileId, role, deletedAt: null },
    select: {
      id: true,
      //   assignedChannels: {
      //     where: { noteChannelId: channel.id },
      //     select: {
      //       emailEnabled: true,
      //       inAppEnabled: true,
      //       whatsappEnabled: true,
      //     },
      //   },
    },
  });

  if (!contact) {
    contact = await db.notePadContacts.create({
      data: {
        // name: email,
        // email,
        role,
        profileId,
      },
      select: {
        id: true,
        // assignedChannels: {
        //   where: { noteChannelId: channel.id },
        //   select: {
        //     emailEnabled: true,
        //     inAppEnabled: true,
        //     whatsappEnabled: true,
        //   },
        // },
      },
    });
  }

  // ── 4. Resolve prefs — contact assignment first, channel defaults as fallback
  //   const prefs = contact.assignedChannels[0];

  return {
    email,
    id: contact.id,
    name: name!,
    role,
    profileId: profileId,
  };
}
export async function getSubscribersForNotificationTypeByIds(
  db: Db,
  notificationType: string,
  profileId: number,
  role: "employee" | "customer",
): Promise<UserData | null> {
  // ── 1. Resolve email from the correct table ──────────────────────────────
  let email: string | null | undefined;
  let name: string | null | undefined;
  if (role === "employee") {
    const user = await db.users.findFirst({
      where: { id: profileId, deletedAt: null },
      select: { email: true, name: true },
    });
    email = user?.email;
    name = user?.name;
  } else {
    const customer = await db.customers.findFirst({
      where: { id: profileId, deletedAt: null },
      select: { email: true, name: true, businessName: true },
    });
    email = customer?.email;
    name = customer?.name || customer?.businessName;
  }

  if (!email) return null;

  // ── 2. Find the channel ──────────────────────────────────────────────────
  const channel = await db.noteChannels.findUnique({
    where: { channelName: notificationType, deletedAt: null },
    select: {
      id: true,
      emailSupport: true,
      inAppSupport: true,
      whatsappSupport: true,
    },
  });

  if (!channel) return null;

  // ── 3. Find or create the NotePadContact ─────────────────────────────────
  let contact = await db.notePadContacts.findFirst({
    where: { profileId, role, deletedAt: null },
    select: {
      id: true,
      profileId: true,
      assignedChannels: {
        where: { noteChannelId: channel.id },
        select: {
          emailEnabled: true,
          inAppEnabled: true,
          whatsappEnabled: true,
        },
      },
    },
  });

  if (!contact) {
    contact = await db.notePadContacts.create({
      data: {
        // name: email,
        // email,
        role,
        profileId,
      },
      select: {
        id: true,
        profileId: true,
        assignedChannels: {
          where: { noteChannelId: channel.id },
          select: {
            emailEnabled: true,
            inAppEnabled: true,
            whatsappEnabled: true,
          },
        },
      },
    });
  }

  // ── 4. Resolve prefs — contact assignment first, channel defaults as fallback
  const prefs = contact.assignedChannels[0];

  return {
    email,
    id: contact.id,
    profileId: contact.profileId!,
    name: name!,
    role,
    emailNotification: prefs?.emailEnabled ?? channel.emailSupport ?? false,
    inAppNotification: prefs?.inAppEnabled ?? channel.inAppSupport ?? false,
    whatsAppNotification:
      prefs?.whatsappEnabled ?? channel.whatsappSupport ?? false,
  };
}
