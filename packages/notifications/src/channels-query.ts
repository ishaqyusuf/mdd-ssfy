import { Db, Prisma } from "@gnd/db";
import { channelNames, channelsConfig, priorityStrings } from "./channels";
import { GetNotificationChannelsSchema } from "./schemas";

import { composeQuery, composeQueryData } from "@gnd/utils/query-response";
export async function getChannels(
  db: Db,
  query: GetNotificationChannelsSchema,
) {
  const where = whereNotificationChannels(query);
  const channels = await db.noteChannels.findMany({
    select: {
      id: true,
      channelName: true,
      priority: true,
      textSupport: true,
      emailSupport: true,
      whatsappSupport: true,
      // userConfigs: {},
      assignedUsers: {
        select: {
          id: true,
          contact: {
            select: {
              profileId: true,
            },
          },
        },
      },
      inAppSupport: true,
      noteChannelRoles: {
        select: {
          role: {
            select: {
              name: true,
              id: true,
            },
          },
        },
      },
      deletedAt: true,
    },
    where: where,
    orderBy: {
      channelName: "asc",
    },
  });
  const activeChannels = channels.filter((c) => !c.deletedAt);
  if (!query.id && !query.name) {
    const deletedChannels = activeChannels
      .filter((c) => !channelNames.includes(c.channelName as any))
      .map((c) => c.channelName);
    const newChannels = channelNames.filter(
      (cn) => !activeChannels.some((c) => c.channelName === cn),
    );
    if (deletedChannels.length) {
      await db.noteChannels.updateMany({
        where: {
          channelName: {
            in: deletedChannels,
          },
        },
        data: {
          deletedAt: new Date(),
        },
      });
    }
    if (newChannels.length) {
      await Promise.all([
        ...newChannels.map(async (c) => {
          const previouslyDeleted = channels.find(
            (ch) => ch.channelName === c && ch.deletedAt,
          );
          if (previouslyDeleted) {
            return db.noteChannels.update({
              where: {
                id: previouslyDeleted!.id,
              },
              data: {
                deletedAt: null,
              },
            });
          }
        }),
        await db.noteChannels.createMany({
          data: newChannels
            .filter((cn) => !channels.some((c) => c.channelName === cn))
            .map((cn) => ({
              channelName: cn,
              priority: channelsConfig[cn].priority || 5,
            })),
        }),
      ]);
    }
    if (deletedChannels.length || newChannels.length)
      return getChannels(db, query); // if there are deleted or new channels, refetch to get the updated list after prisma triggers have added/deleted the channels in the db.
    // five level priorities
    //   const priorityStrings = ["Low", "Medium", "High", "Critical", "Urgent"];
  }
  return channels.map((c) => ({
    id: c.id,
    priority: priorityStrings[(c.priority || 1) - 1] || "Low",
    name: c.channelName,
    title: c.channelName.split("_").join(" ").toLocaleUpperCase(),
    description:
      channelsConfig[c.channelName as keyof typeof channelsConfig]?.title,
    category:
      channelsConfig[c.channelName as keyof typeof channelsConfig]?.category,
    textSupport: c.textSupport,
    emailSupport: c.emailSupport,
    whatsappSupport: c.whatsappSupport,
    inAppSupport: c.inAppSupport,
    roles: c.noteChannelRoles
      .map((ncr) => ncr.role?.name)
      .filter((r): r is string => !!r),
    subscriberIds:
      c.assignedUsers
        ?.map((uc) => uc.contact?.profileId)
        .filter((id): id is number => !!id) || [],
  }));
}
function whereNotificationChannels(query: GetNotificationChannelsSchema) {
  const where: Prisma.NoteChannelsWhereInput[] = [];
  for (const [k, v] of Object.entries(query)) {
    if (!v) continue;
    const value = v as any;
    switch (k as keyof GetNotificationChannelsSchema) {
      case "q":
        const q = { contains: v as string };
        where.push({
          OR: [],
        });
        break;
      case "id":
        where.push({
          id: value,
        });
        break;
    }
  }
  return composeQuery(where);
}
