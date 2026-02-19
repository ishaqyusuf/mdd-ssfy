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
  return (await getSubscribersAccount(db, [authId]))?.[0]?.id;
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
    }),
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

export async function getSubscribersAccount(
  db,
  profileIds: number[],
  options: any = {},
): Promise<any[]> {
  const { role = "employee", channelName } = options;

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
  } else {
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
  } as any;
  const existingContacts = await db.notePadContacts.findMany({
    where: { role, profileId: { in: resolvedIds }, deletedAt: null },
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
          where: { role, profileId, deletedAt: null },
          select: { id: true },
        });
        if (alreadyExists) return;

        await db.notePadContacts.create({
          data: {
            role,
            profileId,
            name: account.name || undefined,
          },
        });
      }),
    );

    // Re-fetch newly created contacts (with channel assignments if applicable)
    const newContacts = await db.notePadContacts.findMany({
      where: { role, profileId: { in: missingIds }, deletedAt: null },
      select: contactSelect,
    });

    for (const c of newContacts) {
      if (c.profileId !== null) contactByProfileId.set(c.profileId, c);
    }
  }

  // ── 5. Build results ───────────────────────────────────────────────────────

  const results: any[] = [];

  for (const profileId of resolvedIds) {
    const contact: any = contactByProfileId.get(profileId);
    if (!contact) continue;

    const account = accountMap.get(profileId)!;

    let result: any = {
      id: contact.id,
      profileId,
      // Account fields (Users/Customers) are authoritative; contact may be stale
      role: (contact.role as "employee" | "customer" | undefined) ?? role,
      name: contact.name!,
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
        // whatsAppNotification: assigned?.textEnabled ?? global.textNotification,
      };
    }

    results.push(result);
  }

  return results;
}
