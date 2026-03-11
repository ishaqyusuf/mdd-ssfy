import { Db, Prisma } from "@gnd/db";
import { UserData } from "./base";

type RecipientRole = "employee" | "customer" | "address";

function toContactRole(role: RecipientRole): "employee" | "customer" {
  return role === "employee" ? "employee" : "customer";
}

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
                      phoneNo: true,
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
    { id: number; email: string; name: string | null; phoneNo: string | null }
  >();

  for (const channelRole of channel.noteChannelRoles) {
    if (!channelRole.role) continue;
    for (const modelRole of channelRole.role.ModelHasRoles) {
      const user = modelRole.user;
      if (!user || user.deletedAt || userMap.has(user.id)) continue;
      userMap.set(user.id, {
        id: user.id,
        email: user.email,
        name: user.name,
        phoneNo: user.phoneNo,
      });
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
      phoneNo: user.phoneNo || undefined,
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
  role: RecipientRole = "employee",
): Promise<{
  id: number;
  profileId: number;
  name: string;
  email?: string;
  phoneNo?: string;
  role?: RecipientRole;
} | null> {
  // ── 1. Resolve email from the correct table ──────────────────────────────
  let email: string | null | undefined;
  let name: string | null | undefined;
  let phoneNo: string | null | undefined;

  if (role === "employee") {
    const user = await db.users.findFirst({
      where: { id: profileId, deletedAt: null },
      select: { email: true, name: true, phoneNo: true },
    });
    email = user?.email;
    name = user?.name;
    phoneNo = user?.phoneNo;
  } else if (role === "customer") {
    const customer = await db.customers.findFirst({
      where: { id: profileId, deletedAt: null },
      select: { email: true, name: true, businessName: true, phoneNo: true },
    });
    email = customer?.email;
    name = customer?.name || customer?.businessName;
    phoneNo = customer?.phoneNo;
  } else {
    const address = await db.addressBooks.findFirst({
      where: { id: profileId, deletedAt: null },
      select: { email: true, name: true, phoneNo: true },
    });
    email = address?.email;
    name = address?.name;
    phoneNo = address?.phoneNo;
  }

  if (!email) return null;
  const contactRole = toContactRole(role);

  // ── 3. Find or create the NotePadContact ─────────────────────────────────
  let contact = await db.notePadContacts.findFirst({
    where: { profileId, role: contactRole, deletedAt: null },
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
        role: contactRole,
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
    phoneNo: phoneNo || undefined,
    role,
    profileId: profileId,
  };
}
export async function getSubscribersForNotificationTypeByIds(
  db: Db,
  notificationType: string,
  profileId: number,
  role: RecipientRole,
): Promise<UserData | null> {
  // ── 1. Resolve email from the correct table ──────────────────────────────
  let email: string | null | undefined;
  let name: string | null | undefined;
  let phoneNo: string | null | undefined;

  if (role === "employee") {
    const user = await db.users.findFirst({
      where: { id: profileId, deletedAt: null },
      select: { email: true, name: true, phoneNo: true },
    });
    email = user?.email;
    name = user?.name;
    phoneNo = user?.phoneNo;
  } else if (role === "customer") {
    const customer = await db.customers.findFirst({
      where: { id: profileId, deletedAt: null },
      select: { email: true, name: true, businessName: true, phoneNo: true },
    });
    email = customer?.email;
    name = customer?.name || customer?.businessName;
    phoneNo = customer?.phoneNo;
  } else {
    const address = await db.addressBooks.findFirst({
      where: { id: profileId, deletedAt: null },
      select: { email: true, name: true, phoneNo: true },
    });
    email = address?.email;
    name = address?.name;
    phoneNo = address?.phoneNo;
  }

  if (!email) return null;
  const contactRole = toContactRole(role);

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
    where: { profileId, role: contactRole, deletedAt: null },
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
        role: contactRole,
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
    phoneNo: phoneNo || undefined,
    role,
    emailNotification: prefs?.emailEnabled ?? channel.emailSupport ?? false,
    inAppNotification: prefs?.inAppEnabled ?? channel.inAppSupport ?? false,
    whatsAppNotification:
      prefs?.whatsappEnabled ?? channel.whatsappSupport ?? false,
  };
}

// ─── Types ────────────────────────────────────────────────────────────────────

/** Channel-level notification flags resolved for one subscriber. */
export interface ChannelNotificationConfig {
  /**
   * Global defaults from NoteChannels (emailSupport, inAppSupport, etc.).
   * Reflects what the channel itself supports regardless of user preference.
   */
  global: {
    emailNotification: boolean;
    inAppNotification: boolean;
    whatsAppNotification: boolean;
    textNotification: boolean;
  };
  /**
   * Per-user overrides from AssignedUserNoteChannel.
   * Present only when an AssignedUserNoteChannel row exists for this contact.
   * When absent the global defaults are the effective config.
   */
  user: {
    emailNotification: boolean;
    inAppNotification: boolean;
    whatsAppNotification: boolean;
    textNotification: boolean;
  } | null;
  /**
   * Effective/resolved flags: user prefs win over global when present,
   * otherwise falls back to global, then false.
   */
  emailNotification: boolean;
  inAppNotification: boolean;
  whatsAppNotification: boolean;
  textNotification: boolean;
}

// ─── Options ─────────────────────────────────────────────────────────────────

export interface GetSubscribersAccountOptions {
  role?: RecipientRole;
  /**
   * NoteChannels.channelName.
   * When provided, each result includes resolved notification flags from:
   *   - NoteChannels  (global: emailSupport / inAppSupport / whatsappSupport / textSupport)
   *   - AssignedUserNoteChannel  (per-contact per-channel overrides)
   *
   * Resolution order: user prefs → global channel defaults → false.
   */
  channelName?: string;
}

// ─────────────────────────────────────────────────────────────────────────────

/**
 * Resolves account details for a list of profile ids (Users.id or Customers.id).
 *
 * Resolution chain (always):
 *   profileIds
 *     └─ NoteChannel (if channelName given)  → global notification defaults
 *     └─ NotePadContacts  (role + profileId IN profileIds)
 *          │  [auto-created for any profileId that has no contact yet]
 *          ├─ profileId → Users      (role = "employee") → name, email, phoneNo
 *          │            → Customers  (role = "customer") → name, email, phoneNo
 *          └─ AssignedUserNoteChannel (if channelName given) → per-user overrides
 *
 * Schema notes:
 *   - NotePadContacts.profileId is a bare Int? (no FK) — joined in memory.
 *   - Users.id / Customers.id / NoteChannels.id are all @unique (not @id).
 *   - NoteChannels has @@unique([channelName]) — findUnique by channelName is valid.
 *   - AssignedUserNoteChannel has no unique constraint — findFirst by
 *     (noteChannelId, notePadContactId) is used.
 *   - UserNoteChannelConfig has no per-user flags; global defaults come from
 *     NoteChannels directly.
 */
export async function getSubscribersAccount(
  db: Db,
  profileIds: number[],
  options: GetSubscribersAccountOptions = {},
): Promise<UserData[]> {
  const { role = "employee", channelName } = options;
  const contactRole = toContactRole(role);

  if (!profileIds.length) return [];

  const uniqueProfileIds = Array.from(new Set(profileIds));

  // ── 1. Resolve channel (if requested) ─────────────────────────────────────
  // NoteChannels.channelName has @@unique — findUnique is valid.
  // Fetch upfront so its id is available when building AssignedUserNoteChannel
  // queries, and its support flags are available for global defaults.

  type ChannelRow = {
    id: number;
    emailSupport: boolean | null;
    inAppSupport: boolean | null;
    whatsappSupport: boolean | null;
    // textSupport: boolean | null;
  };

  let channel: ChannelRow | null = null;

  if (channelName) {
    channel = await db.noteChannels.findUnique({
      where: { channelName, deletedAt: null },
      select: {
        id: true,
        emailSupport: true,
        inAppSupport: true,
        whatsappSupport: true,
        // textSupport: true,
      },
    });
    // Channel not found — proceed without notification config rather than throw,
    // so callers get account data even when the channel name is stale/wrong.
  }
  // ── 2. Fetch source accounts (Users or Customers) ─────────────────────────
  // Done first to gate contact creation: if a profileId has no real account,
  // we must not create an orphaned NotePadContacts row for it.

  type AccountRow = {
    id: number;
    name: string | null;
    email: string | null;
    phoneNo: string | null;
  };

  const accountMap = new Map<number, AccountRow>();

  if (role === "employee") {
    const users = await db.users.findMany({
      where: { id: { in: uniqueProfileIds }, deletedAt: null },
      select: { id: true, name: true, email: true, phoneNo: true },
    });
    for (const u of users) {
      accountMap.set(u.id, {
        id: u.id,
        name: u.name,
        email: u.email, // Users.email is non-nullable in schema
        phoneNo: u.phoneNo,
      });
    }
  } else if (role === "customer") {
    const customers = await db.customers.findMany({
      where: { id: { in: uniqueProfileIds }, deletedAt: null },
      select: { id: true, name: true, email: true, phoneNo: true },
    });
    for (const c of customers) {
      accountMap.set(c.id, {
        id: c.id,
        name: c.name,
        email: c.email,
        phoneNo: c.phoneNo,
      });
    }
  } else {
    const addresses = await db.addressBooks.findMany({
      where: { id: { in: uniqueProfileIds }, deletedAt: null },
      select: { id: true, name: true, email: true, phoneNo: true },
    });
    for (const address of addresses) {
      accountMap.set(address.id, {
        id: address.id,
        name: address.name,
        email: address.email,
        phoneNo: address.phoneNo,
      });
    }
  }

  // Only proceed with profileIds that resolved to a real account
  const resolvedIds = uniqueProfileIds.filter((id) => accountMap.has(id));
  if (!resolvedIds.length) return [];

  // ── 3. Fetch existing NotePadContacts ─────────────────────────────────────
  // Include AssignedUserNoteChannel in the same query when a channel is known —
  // avoids a second round-trip per contact.

  const contactSelect = {
    id: true,
    profileId: true,
    name: true,
    role: true,
    ...(channel
      ? {
          assignedChannels: {
            where: { noteChannelId: channel.id },
            select: {
              emailEnabled: true,
              inAppEnabled: true,
              whatsappEnabled: true,
              // textEnabled: true,
            },
          },
        }
      : {}),
  } satisfies Prisma.NotePadContactsSelect;
  const existingContacts = await db.notePadContacts.findMany({
    where: { role: contactRole, profileId: { in: resolvedIds }, deletedAt: null },
    select: contactSelect,
  });

  const contactByProfileId = new Map(
    existingContacts
      .filter((c) => c.profileId !== null)
      .map((c) => [c.profileId!, c]),
  );

  // ── 4. Auto-create contacts for accounts that have no contact row yet ──────
  const missingIds = resolvedIds.filter((id) => !contactByProfileId.has(id));

  if (missingIds.length) {
    await Promise.all(
      missingIds.map(async (profileId) => {
        const account = accountMap.get(profileId)!;

        // Race-condition guard: another concurrent request may have just created it
        const alreadyExists = await db.notePadContacts.findFirst({
          where: { role: contactRole, profileId, deletedAt: null },
          select: { id: true },
        });
        if (alreadyExists) return;

        await db.notePadContacts.create({
          data: {
            role: contactRole,
            profileId,
            name: account.name || undefined,
          },
        });
      }),
    );

    // Re-fetch newly created contacts (with channel assignments if applicable)
    const newContacts = await db.notePadContacts.findMany({
      where: {
        role: contactRole,
        profileId: { in: missingIds },
        deletedAt: null,
      },
      select: contactSelect,
    });

    for (const c of newContacts) {
      if (c.profileId !== null) contactByProfileId.set(c.profileId, c);
    }
  }

  // ── 5. Build results ───────────────────────────────────────────────────────

  const results: UserData[] = [];

  for (const profileId of resolvedIds) {
    const contact = contactByProfileId.get(profileId);
    if (!contact) continue;

    const account = accountMap.get(profileId)!;

    let result: UserData = {
      id: contact.id,
      profileId,
      // Account fields (Users/Customers) are authoritative; contact may be stale
      role,
      name: account.name || contact.name || `User ${profileId}`,
      email: account.email || undefined,
      phoneNo: account.phoneNo || undefined,
    };

    // ── 5a. Attach channel notification config when channel was resolved ──────
    if (channel) {
      // Global defaults: what the channel itself supports
      const global = {
        emailNotification: channel.emailSupport ?? false,
        inAppNotification: channel.inAppSupport ?? false,
        whatsAppNotification: channel.whatsappSupport ?? false,
        // textNotification: channel.textSupport ?? false,
      };

      // Per-user overrides: AssignedUserNoteChannel row for this contact+channel
      // The assignedChannels array is scoped to channel.id in the select above,
      // so [0] is the only possible match.
      const assigned =
        "assignedChannels" in contact ? contact.assignedChannels[0] : undefined;
      result = {
        ...result,
        emailNotification: assigned?.emailEnabled ?? global.emailNotification,
        inAppNotification: assigned?.inAppEnabled ?? global.inAppNotification,
        whatsAppNotification:
          assigned?.whatsappEnabled ?? global.whatsAppNotification,
      };
    }

    // console.log(new Date().toISOString(), "DEBUG", { result });
    results.push(result);
  }
  return results;
}
