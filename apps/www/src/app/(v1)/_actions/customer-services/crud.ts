"use server";

import { prisma } from "@/db";

export async function getCustomerService(slug) {
  const wo = await prisma.workOrders.findFirst({
    where: { slug },
    include: {
      tech: true,
    },
  });
  return wo;
}
export async function deleteCustomerService(slug) {
  await prisma.workOrders.delete({
    where: { slug },
  });
}
