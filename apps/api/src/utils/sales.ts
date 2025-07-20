import { statToKeyValueDto, type Item } from "@api/dto/sales-dto";
import type { SalesQueryParamsSchema } from "@api/schemas/sales";
import type {
  AddressBookMeta,
  CustomerMeta,
  QtyControlType,
  SalesStatStatus,
} from "@api/type";
import type { Prisma } from "@gnd/db";
import { sumArrayKeys } from "@gnd/utils";
import dayjs from "@gnd/utils/dayjs";
import { padStart } from "lodash";

export function salesAddressLines(
  address: Prisma.AddressBooksGetPayload<{}>,
  customer?: Prisma.CustomersGetPayload<{}>,
) {
  let meta = address?.meta as any as AddressBookMeta;
  let cMeta = customer?.meta as any as CustomerMeta;
  return [
    address?.name || customer?.name || customer?.businessName,
    address?.phoneNo || customer?.phoneNo || customer?.phoneNo2,
    address?.email || customer?.email,
    address?.address1 || customer?.address,
    address?.address2,
    [address?.city, address?.state, meta?.zip_code, address?.country]
      ?.filter(Boolean)
      ?.join(", "),
  ].filter(Boolean);
}
export function composeSalesStat(stats: Prisma.SalesStatGetPayload<{}>[]) {
  const statDateCheck = stats.map((stat) => {
    const isValid = dayjs(stat.createdAt).isAfter(dayjs("2025-04-15"), "days");
    return {
      isValid,
    };
  });
  let validStat = statDateCheck.every((a) => a.isValid);
  const _stat: { [id in QtyControlType]: (typeof stats)[number] } = {} as any;
  stats.map((s) => (_stat[s.type] = s));
  return {
    isValid: validStat,
    ..._stat,
  };
}
export function qtyControlsByType(controls: Prisma.QtyControlGetPayload<{}>[]) {
  const _stat: { [id in QtyControlType]: (typeof controls)[number] } =
    {} as any;
  controls.map((c) => (_stat[c.type] = c));
  return _stat;
}

export function transformSalesFilterQuery(query: SalesQueryParamsSchema) {
  if (
    Object.entries(query)
      .filter(([a, b]) => !!b)
      .every(([a]) => ["sales.type", "start"].includes(a))
  ) {
    console.log("NOT FILTERED!");
    query["dispatch.status"] = "pending";
  } else {
    console.log("FILTERED!");
  }
  return query;
}
export function salesLinks(data: Item) {
  return {
    edit: data.isDyke ? `` : ``,
    overview: `/sales-book/${data.type}/${data.slug}`,
    customer: data.customer
      ? `/sales-book/customer/${data.customer?.id}`
      : null,
  };
}
export function dispatchTitle(id, prefix = "#DISPATCH") {
  return `${prefix}-${padStart(id.toString(), 4, "0")}`;
}
export function overallStatus(dataStats: Prisma.SalesStatGetPayload<{}>[]) {
  // console.log(dataStats);
  const sk = statToKeyValueDto(dataStats);
  const dispatch = sumArrayKeys(
    [sk.dispatchAssigned, sk.dispatchInProgress, sk.dispatchCompleted],
    ["score", "total", "percentage"],
  );

  return {
    production: statStatus(sk.prodCompleted),
    assignment: statStatus(sk.prodAssigned),
    // payment: statStatus(sk.),
    delivery: statStatus(dispatch as any),
  };
}

export function statStatus(stat: Prisma.SalesStatGetPayload<{}>): {
  color;
  status: SalesStatStatus;
  scoreStatus: string;
} {
  const { percentage, score, total } = stat || {};
  let scoreStatus = "";
  if (score! > 0 && score != total) scoreStatus = `${score}/${total}`;

  if (percentage === 0 && total! > 0)
    return {
      color: "warmGray",
      status: "pending",
      scoreStatus,
    };
  if (percentage == 0 && total == 0)
    return {
      color: "amber",
      status: "N/A" as any,
      scoreStatus,
    };
  if (percentage! > 0 && percentage! < 100)
    return {
      color: "rose",
      status: "in progress",
      scoreStatus,
    };
  if (percentage === 100)
    return {
      status: "completed",
      color: "green",
      scoreStatus,
    };
  return {
    color: "stone",
    status: "unknown",
    scoreStatus,
  };
}
export const SalesListInclude = {
  customer: {
    select: {
      id: true,
      name: true,
      businessName: true,
      phoneNo: true,
      email: true,
      address: true,
    },
  },
  billingAddress: true,
  shippingAddress: true,
  salesRep: {
    select: {
      name: true,
    },
  },
  deliveries: true,
  stat: true,
  extraCosts: true,
} satisfies Prisma.SalesOrdersInclude;
export const excludeDeleted = {
  where: { deletedAt: null },
};
const AssignmentsInclude = {
  where: {
    ...excludeDeleted.where,
    assignedToId: undefined,
  },
  include: {
    assignedTo: true,
    submissions: {
      ...excludeDeleted,
      include: {
        itemDeliveries: {
          ...excludeDeleted,
        },
      },
    },
  },
} satisfies
  | Prisma.DykeSalesDoors$productionsArgs
  | Prisma.SalesOrderItems$assignmentsArgs;
export const SalesIncludeAll = {
  extraCosts: true,
  items: {
    where: { deletedAt: null },
    include: {
      formSteps: {
        ...excludeDeleted,
        include: {
          step: true,
        },
      },
      salesDoors: {
        include: {
          housePackageTool: {
            include: {
              door: true,
            },
          },
          productions: AssignmentsInclude,
        },
        where: {
          doorType: {
            // in: salesData.productionDoorTypes,
          },
          ...excludeDeleted.where,
        },
      },
      assignments: AssignmentsInclude,
      shelfItems: {
        where: { deletedAt: null },
        include: {
          shelfProduct: true,
        },
      },
      housePackageTool: {
        ...excludeDeleted,
        include: {
          casing: excludeDeleted,
          door: excludeDeleted,
          jambSize: excludeDeleted,
          doors: {
            ...excludeDeleted,
          },
          molding: excludeDeleted,
        },
      },
    },
  },
  customer: excludeDeleted,
  shippingAddress: excludeDeleted,
  billingAddress: excludeDeleted,
  producer: excludeDeleted,
  salesRep: excludeDeleted,
  productions: excludeDeleted,
  payments: excludeDeleted,
  stat: excludeDeleted,
  deliveries: excludeDeleted,
  itemDeliveries: excludeDeleted,
  taxes: excludeDeleted,
} satisfies Prisma.SalesOrdersInclude;
