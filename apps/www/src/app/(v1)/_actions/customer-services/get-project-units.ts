"use server";

import { prisma } from "@/db";

export async function getProjectUnitList(projectId) {
  const units = await prisma.homes.findMany({
    where: {
      projectId,
    },
    select: {
      id: true,
      lot: true,
      block: true,
    },
  });
  return (units as any)
    .map((unit) => {
      unit.lotBlock = `${unit.lot || "-"}/${unit.block || "-"}`;
      return unit;
    })
    .sort((a, b) => a.lotBlock - b.lotBlock);
}
