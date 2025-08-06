import { statToKeyValueDto, type Item } from "@api/dto/sales-dto";
import type { SalesQueryParamsSchema } from "@api/schemas/sales";
import type {
  AddressBookMeta,
  CustomerMeta,
  ItemStatConfigProps,
  QtyControlType,
  SalesStatStatus,
} from "@api/type";
import type { Prisma } from "@gnd/db";
import { sumArrayKeys } from "@gnd/utils";
import dayjs from "@gnd/utils/dayjs";
import type { DispatchItemPackingStatus } from "@sales/types";
import { padStart } from "lodash";

export function salesAddressLines(
  address: Prisma.AddressBooksGetPayload<{}>,
  customer?: Prisma.CustomersGetPayload<{}>
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
  const keys: (keyof SalesQueryParamsSchema)[] = ["cursor", "salesType"];
  if (
    Object.entries(query)
      .filter(([a, b]) => !!b)
      .every(([a]) => keys.includes(a as any))
  ) {
    query["dispatch.status"] = "pending";
  } else {
  }
  // query["dispatch.status"] = "completed";
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
  const sk = statToKeyValueDto(dataStats);
  const dispatch = sumArrayKeys(
    [sk.dispatchAssigned, sk.dispatchInProgress, sk.dispatchCompleted],
    ["score", "total", "percentage"]
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
      scoreStatus: "N/A",
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

export function getItemStatConfig({ setting, ...props }: ItemStatConfigProps) {
  const mainStep = props.formSteps?.[0];
  const stepConfigUid = mainStep?.prodUid;
  let config = setting?.route?.[stepConfigUid]?.config;

  const isService = mainStep?.value?.toLowerCase() == "services";

  return props.isDyke
    ? {
        production: isService
          ? props.dykeProduction
          : props?.prodOverride
            ? props?.prodOverride?.production
            : config?.production,
        shipping: config?.shipping,
      }
    : {
        production: !!(props.qty && props.swing),
        shipping: !!props.qty,
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
  deliveries: {
    where: {
      deletedAt: null,
    },
    include: {
      _count: {
        select: {
          items: {
            where: {
              deletedAt: null,
            },
          },
        },
      },
    },
  },
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
          where: {
            ...excludeDeleted.where,
            packingStatus: "packed" as DispatchItemPackingStatus,
          },
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
export const FullSalesSelect = {
  meta: true,
  orderId: true,
  isDyke: true,
  id: true,
  customer: true,
  createdAt: true,
  shippingAddress: {
    include: {
      region: true,
    },
  },
  deliveries: {
    where: {
      deletedAt: null,
    },
    select: {
      status: true,
      deliveryMode: true,
      id: true,
      createdBy: {
        select: {
          name: true,
        },
      },
      driver: {
        select: {
          name: true,
          id: true,
        },
      },
      createdAt: true,
      dueDate: true,
      items: {
        where: {
          deletedAt: null,
        },
        select: {
          id: true,
          qty: true,
          lhQty: true,
          rhQty: true,
          orderProductionSubmissionId: true,
          status: true,
          createdAt: true,
        },
      },
    },
  },
  assignments: {
    where: {
      assignedToId: undefined, // !producerId ? undefined : producerId,
      deletedAt: null,
    },
    select: {
      id: true,
      itemId: true,
      dueDate: true,
      lhQty: true,
      rhQty: true,
      salesDoorId: true,
      qtyAssigned: true,
      createdAt: true,
      salesItemControlUid: true,
      shelfItemId: true,
      assignedTo: {
        select: {
          id: true,
          name: true,
        },
      },
      submissions: {
        where: {
          deletedAt: null,
        },
        select: {
          id: true,
          createdAt: true,
          note: true,
          qty: true,
          rhQty: true,
          lhQty: true,
        },
      },
    },
  },
  items: {
    where: {
      deletedAt: null,
    },
    select: {
      shelfItems: {
        select: {
          id: true,
        },
      },
      multiDykeUid: true,
      multiDyke: true,
      description: true,
      dykeDescription: true,
      dykeProduction: true,
      qty: true,
      id: true,
      meta: true,
      total: true,
      swing: true,
      rate: true,
      formSteps: {
        where: {
          deletedAt: null,
        },
        select: {
          prodUid: true,
          value: true,
          step: {
            select: {
              title: true,
            },
          },
        },
      },
      housePackageTool: {
        where: {
          deletedAt: null,
        },
        select: {
          id: true,
          stepProduct: {
            where: {
              deletedAt: null,
            },
            select: {
              id: true,
              name: true,
            },
          },
          door: {
            select: {
              id: true,
              title: true,
            },
          },
          doors: {
            where: {
              deletedAt: null,
            },
            select: {
              id: true,
              dimension: true,
              swing: true,
              lineTotal: true,
              unitPrice: true,
              rhQty: true,
              lhQty: true,
              totalQty: true,
              meta: true,
              stepProduct: {
                select: {
                  name: true,
                  door: {
                    select: {
                      title: true,
                    },
                  },
                  product: {
                    select: {
                      id: true,
                      title: true,
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
  },
  itemControls: {
    where: {
      deletedAt: null,
    },
    select: {
      shippable: true,
      produceable: true,
      sectionTitle: true,
      title: true,
      uid: true,
      qtyControls: {
        where: {
          deletedAt: null,
          type: {
            in: [
              "dispatchCompleted",
              "prodAssigned",
              "prodCompleted",
              "qty",
              "dispatchAssigned",
              "dispatchInProgress",
            ] as QtyControlType[],
          },
        },
      },
    },
  },
} satisfies Prisma.SalesOrdersSelect;
