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
    const deletedBuiltInChannels = channels
      .filter(
        (c) => !!c.deletedAt && channelNames.includes(c.channelName as any),
      )
      .map((c) => c.channelName);
    const newChannels = channelNames.filter(
      (cn) => !activeChannels.some((c) => c.channelName === cn),
    );
    const channelsToCreate = newChannels.filter(
      (cn) => !channels.some((c) => c.channelName === cn),
    );
    const channelsToRestore = newChannels.filter((cn) =>
      channels.some((c) => c.channelName === cn && !!c.deletedAt),
    );

    if (deletedBuiltInChannels.length) {
      await db.noteChannels.updateMany({
        where: {
          channelName: {
            in: deletedBuiltInChannels,
          },
        },
        data: {
          deletedAt: null,
        },
      });
    }

    if (channelsToRestore.length) {
      await db.noteChannels.updateMany({
        where: {
          channelName: {
            in: channelsToRestore,
          },
        },
        data: {
          deletedAt: null,
        },
      });
    }

    if (channelsToCreate.length) {
      await db.noteChannels.createMany({
        data: channelsToCreate.map((cn) => ({
          channelName: cn,
          priority: channelsConfig[cn]?.priority || 5,
        })),
        skipDuplicates: true,
      });
    }

    if (
      deletedBuiltInChannels.length ||
      channelsToRestore.length ||
      channelsToCreate.length
    ) {
      return getChannels(db, query);
    }
    // five level priorities
    //   const priorityStrings = ["Low", "Medium", "High", "Critical", "Urgent"];
  }
  return channels.map((c) => {
    const config = channelsConfig[c.channelName as keyof typeof channelsConfig];
    return {
      id: c.id,
      priority: priorityStrings[(c.priority || 1) - 1] || "Low",
      name: c.channelName,
      deletable: !channelNames.includes(c.channelName as any),
      title: config?.name || c.channelName.split("_").join(" ").toLocaleUpperCase(),
      description: config?.description,
      category: config?.category,
      // status: config?.published ? "Published" : "Draft",
      published: !!config?.published,
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
    };
  });
}
function whereNotificationChannels(query: GetNotificationChannelsSchema) {
  const where: Prisma.NoteChannelsWhereInput[] = [];
  for (const [k, v] of Object.entries(query)) {
    if (!v) continue;
    const value = v as any;
    switch (k as keyof GetNotificationChannelsSchema) {
      case "name":
        where.push({
          channelName: {
            contains: value,
          },
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
