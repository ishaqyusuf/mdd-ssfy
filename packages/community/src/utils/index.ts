import { formatDate } from "@gnd/utils/dayjs";
import { Prisma } from "@sales/types";

export function getPivotModel(model) {
  if (!model) return "";
  const pivotM = model
    .toLowerCase()
    .split(" ")
    .flatMap((part) => part.split("/"))
    .filter(Boolean)
    .filter((v) => !["lh", "rh", "l", "r"].includes(v))
    .join(" ");
  return pivotM;
}
export const inputSizes = ["xs", "sm", "md", "lg"];
export const projectUnitsSelect = {
  id: true,
  createdAt: true,
  lotBlock: true,
  modelName: true,
  tasks: {
    where: {
      deletedAt: null,
    },
    select: {
      produceable: true,
      sentToProductionAt: true,
      producedAt: true,
      productionDueDate: true,
    },
  },
  _count: {
    select: {
      jobs: true,
    },
  },
  project: {
    select: {
      title: true,
      builder: {
        select: {
          name: true,
        },
      },
    },
  },
} satisfies Prisma.HomesSelect;
export function getUnitProductionStatus(
  home: Prisma.HomesGetPayload<{
    select: typeof projectUnitsSelect;
  }>
) {
  const prod = home?.tasks?.filter((t) => t.produceable);
  let prodDate: any = null;
  // if (home.builderId == 14)

  const produceables = prod?.length;
  let produced = prod?.filter((p) => p.producedAt).length;
  const hasJob = home?._count.jobs;
  if (hasJob) produced = prod.length;
  const pending = produceables - produced;
  let productionStatus = "Idle";
  if (home.id == 10217) {
  }
  const sent = prod?.filter((p) => p.sentToProductionAt)?.length;
  prodDate = prod.filter((p) => p.productionDueDate)?.[0]?.productionDueDate;
  if (sent > 0) productionStatus = "Queued";
  if (produced > 0) {
    productionStatus = "Started";
    if (produced == produceables) {
      productionStatus = "Completed";
      prodDate = prod.filter((p) => p.producedAt)?.[0]?.producedAt;
    }
  }
  if (hasJob) {
    productionStatus = "Completed";
    prodDate = prod.filter((p) => p.producedAt)?.[0]?.producedAt;
  }
  if (prodDate) prodDate = formatDate(prodDate);
  return {
    date: prodDate,
    produceables,
    produced,
    pendings: pending,
    status: productionStatus,
    // badgeColor: getBadgeColor(productionStatus),
  };
}
