import { Db } from "@gnd/db";
import { channelNames, channelsConfig } from "./channels";

export async function getChannels(db: Db) {
  const channels = await db.noteChannels.findMany({
    select: {
      id: true,
      channelName: true,
      priority: true,
      textSupport: true,
      emailSupport: true,
      whatsappSupport: true,
      userConfigs: {},
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
    where: {
      deletedAt: {},
    },
    orderBy: {
      channelName: "desc",
    },
  });
  const activeChannels = channels.filter((c) => !c.deletedAt);
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
  if (deletedChannels.length || newChannels.length) return getChannels(db); // if there are deleted or new channels, refetch to get the updated list after prisma triggers have added/deleted the channels in the db.
  return channels;
}
