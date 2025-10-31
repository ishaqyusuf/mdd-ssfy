"use server";

import { prisma } from "@/db";
import { removeEmptyValues, slugModel } from "@/lib/utils";
import dayjs from "dayjs";

export async function dateUpdate() {
  const workOrders = await prisma.workOrders.findMany({
    where: {},
  });
  const data: any = {};
  workOrders.map((w) => {
    if (w.scheduleDate) {
      const d = dayjs(w.scheduleDate).format("YYYY-MM-DD HH:mm:ss");
      if (!data[d]) data[d] = [];
      data[d].push(w.id);
    }
  });
  const sql: any = [];
  Object.entries(data).map(([k, ids]: any) => {
    if (ids.length == 1)
      sql.push(
        `UPDATE WorkOrders SET scheduleDate = '${k}' WHERE id =${ids[0]};`
      );
    else
      sql.push(
        `UPDATE WorkOrders SET scheduleDate = '${k}' WHERE id IN (${ids.join(
          ","
        )});`
      );
  });
  return sql.join("\n");
  // await Promise.all(
  //   workOrders.map(async (wo) => {
  //     await prisma.workOrders.update({
  //       where: { id: wo.id },
  //       data: {
  //         scheduleDate: dayjs(wo.scheduleDate).toISOString(),
  //       },
  //     });
  //   })
  // );
}
export async function upgradeWorkOrder() {
  const workOrders = await prisma.workOrders.findMany({
    where: {},
  });

  await Promise.all(
    workOrders.map(async (a) => {
      let m: any = a.meta ?? {};
      if (Array.isArray(m)) m = {};
      if (a.techId || Object.keys(m).length == 0) return;
      const { tech, ...meta } = m;
      const update: any = {};
      if (a.requestDate)
        update.requestDate = dayjs(a.requestDate).toISOString();
      update.techId = tech?.user_id;
      update.assignedAt = tech?.assigned_at
        ? dayjs(tech.assigned_at).toISOString()
        : null;
      update.meta = removeEmptyValues(meta);
      await prisma.workOrders.update({
        where: { id: a.id },
        data: update,
      });
    })
  );
}
