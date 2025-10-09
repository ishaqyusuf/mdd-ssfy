// import { statToKeyValueDto, type Item } from "@api/dto/sales-dto";
// import type { SalesQueryParamsSchema } from "@api/schemas/sales";
// import type {
//   AddressBookMeta,
//   CustomerMeta,
//   ItemStatConfigProps,
//   QtyControlType,
//   SalesStatStatus,
// } from "@api/type";
import type { Db, Prisma, SalesStat } from "@gnd/db";
import { sumArrayKeys } from "@gnd/utils";
import dayjs, { formatDate } from "@gnd/utils/dayjs";
import { padStart } from "lodash";
import {
  AddressBookMeta,
  CustomerMeta,
  DispatchItemPackingStatus,
  DykeDoorType,
  ItemStatConfigProps,
  QtyControlType,
  SalesStatStatus,
  SalesType,
  TypedSalesStat,
} from "../types";
import { SalesQueryParamsSchema } from "../schema";

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
  if (
    Object.entries(query)
      .filter(([a, b]) => !!b)
      .every(([a]) => ["sales.type", "start"].includes(a))
  ) {
    query["dispatch.status"] = "pending";
  } else {
  }
  return query;
}

export function dispatchTitle(id, prefix = "#DISPATCH") {
  return `${prefix}-${padStart(id.toString(), 4, "0")}`;
}

export function statStatus(stat: Prisma.SalesStatGetPayload<{}>): {
  color;
  status: SalesStatStatus;
  scoreStatus: string;
  score;
  total;
} {
  const { percentage, score, total } = stat || {};
  let scoreStatus = "";
  if (score! > 0 && score != total) scoreStatus = `${score}/${total}`;

  if (percentage === 0 && total! > 0)
    return {
      color: "warmGray",
      status: "pending",
      scoreStatus,
      score,
      total,
    };
  if (percentage == 0 && total == 0)
    return {
      color: "amber",
      status: "N/A" as any,
      scoreStatus: "N/A",
      score,
      total,
    };
  if (percentage! > 0 && percentage! < 100)
    return {
      color: "rose",
      status: "in progress",
      scoreStatus,
      score,
      total,
    };
  if (percentage === 100)
    return {
      status: "completed",
      color: "green",
      scoreStatus,
      score,
      total,
    };
  return {
    color: "stone",
    status: "unknown",
    scoreStatus,
    score,
    total,
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
          component: true,
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
          stepProduct: {
            select: {
              name: true,
              product: {
                select: {
                  title: true,
                },
              },
            },
          },
          doors: {
            ...excludeDeleted,
            include: {
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
                      title: true,
                    },
                  },
                },
              },
            },
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
  deliveries: {
    ...excludeDeleted,
    include: {
      items: {
        include: {
          submission: {
            include: {
              assignment: true,
            },
          },
        },
      },
    },
  },
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
          packingStatus: "packed" as DispatchItemPackingStatus,
        },
        select: {
          id: true,
          qty: true,
          lhQty: true,
          rhQty: true,
          orderProductionSubmissionId: true,
          status: true,
          createdAt: true,
          packedBy: true,
          packingUid: true,
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
export type SalesDispatchStatus =
  | "queue"
  | "in progress"
  | "completed"
  | "cancelled";

export function getDispatchControlType(
  status: SalesDispatchStatus
): QtyControlType {
  switch (status) {
    case "cancelled":
      return "dispatchCancelled";
    case "completed":
      return "dispatchCompleted";
    case "in progress":
      return "dispatchInProgress";
    default:
      return "dispatchAssigned";
  }
}
export function isComponentType(type: DykeDoorType) {
  const resp = {
    slab: type == "Door Slabs Only",
    bifold: type == "Bifold",
    service: type == "Services",
    garage: type == "Garage",
    shelf: type == "Shelf Items",
    exterior: type == "Exterior",
    interior: type == "Interior",
    moulding: type == "Moulding",
    hasSwing: false,
    multiHandles: false,
  };
  resp.hasSwing = resp.garage;
  resp.multiHandles = resp.interior || resp.exterior || resp.garage;
  // resp.interior || resp.exterior || resp.garage || !type;
  return resp;
}
export function inToFt(_in) {
  let _ft = _in;
  const duo = _ft.split("x");
  if (duo.length == 2) {
    return `${inToFt(duo[0]?.trim())} x ${inToFt(duo[1]?.trim())}`;
  }
  try {
    _ft = +_in.split('"')?.[0]?.split("'")[0]?.split("in")?.[0];

    if (_ft > 0) {
      _ft = +_ft;
      const ft = Math.floor(_ft / 12);
      const rem = _ft % 12;

      return `${ft}-${rem}`;
    }
  } catch (e) {}
  return _in;
}
export function ftToIn(h) {
  const [ft, _in] = h
    ?.split(" ")?.[0]
    ?.split("-")
    ?.map((s) => s?.trim())
    .filter(Boolean);
  return `${+_in + +ft * 12}in`;
}
export function calculatePaymentTerm(paymentTerm, createdAt) {
  const t = parseInt(paymentTerm?.replace("Net", ""));
  let goodUntil: any = null;
  if (t) {
    goodUntil = dayjs(createdAt).add(t, "days").toISOString();
  }

  // form.setValue("goodUntil", goodUntil);

  return goodUntil;
}
export function dueDateAlert(dates): { text; color; date } {
  const today = dayjs();

  const result = {
    today: null as any,
    pastDues: [] as any[],
    futureDues: [] as any[],
  };

  for (const date of dates) {
    const dueDate = dayjs(date).startOf("day");
    const today = dayjs().startOf("day"); // Ensure today is properly set to start of the day
    const diff = dueDate.diff(today, "day");
    const isToday = dueDate.isSame(today, "day"); // Fix unit here

    if (isToday) {
      result.today = { text: "due today", color: "yellow", date };
    } else if (diff < 0) {
      const absDiff = Math.abs(diff);
      if (absDiff === 1) {
        result.pastDues.push({
          text: "due yesterday",
          color: "red",
          date,
        });
      } else if (absDiff <= 7) {
        result.pastDues.push({
          text: `${absDiff} days ago`,
          color: "red",
          date,
        });
      } else {
        result.pastDues.push({ text: "last week", color: "red", date });
      }
    } else if (diff > 0) {
      if (diff === 1) {
        result.futureDues.push({
          text: "due tomorrow",
          color: "green",
          date,
        });
      } else if (diff <= 7) {
        result.futureDues.push({
          text: `on ${dueDate.format("dddd")}`,
          color: "blue",
          date,
        });
      } else {
        result.futureDues.push({
          text: "next week",
          color: "blue",
          date,
        });
      }
    } else {
    }

    // const dueDate = dayjs(date);
    // const diff = dueDate.diff(today, "day");
    // const isToday = dueDate.isSame(today, "date");

    // if (isToday) {
    //     result.today = { text: "due today", color: "yellow", date };
    // } else if (diff < 0) {
    //     const absDiff = Math.abs(diff);
    //     if (absDiff === 1) {
    //         result.pastDues.push({
    //             text: "due yesterday",
    //             color: "red",
    //             date,
    //         });
    //     } else if (absDiff <= 7) {
    //         result.pastDues.push({
    //             text: `${absDiff} days ago`,
    //             color: "red",
    //             date,
    //         });
    //     } else {
    //         result.pastDues.push({ text: "last week", color: "red", date });
    //     }
    // } else if (diff > 0) {

    //     if (diff === 1) {
    //         result.futureDues.push({
    //             text: "due tomorrow",
    //             color: "green",
    //             date,
    //         });
    //     } else if (diff <= 7) {
    //         result.futureDues.push({
    //             text: `on ${dueDate.format("dddd")}`,
    //             color: "blue",
    //             date,
    //         });
    //     } else {
    //         result.futureDues.push({
    //             text: "next week",
    //             color: "blue",
    //             date,
    //         });
    //     }
    // }
  }

  result.pastDues.sort((a, b) => dayjs(b.date).diff(dayjs(a.date)));

  // Sort futureDues in ascending order (soonest first)
  result.futureDues.sort((a, b) => dayjs(a.date).diff(dayjs(b.date)));

  const _date = result.today
    ? result.today
    : result?.pastDues?.length
      ? result?.pastDues[0]
      : result?.futureDues?.length
        ? result?.futureDues[0]
        : {
            text: "No due dates",
            color: "gray",
            date: null,
          };
  return {
    ..._date,
    dateString: _date?.date ? formatDate(_date.date) : null,
  };
}
export function composeSalesStatKeyValue(stats: SalesStat[]) {
  const resp: { [id in QtyControlType]: TypedSalesStat } = {} as any;

  stats.map((stat) => (resp[stat.type] = stat));

  return resp;
}
export function overallStatus(dataStats: SalesStat[]) {
  const sk = statToKeyValue(dataStats);
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
export function statToKeyValue(dataStats: SalesStat[], reset = false) {
  // const dataStats = data.stat;
  const k: { [k in QtyControlType]: SalesStat } = {} as any;
  dataStats?.map(({ score, percentage, total, ...rest }) => {
    if (reset) {
      score = percentage = total = 0;
    }
    k[rest.type] = {
      ...rest,
      score,
      percentage,
      total,
    };
  });
  return k;
}
export async function generateHistorySlug(db: Db, slug) {
  const count = await db.salesOrders.count({
    where: {
      deletedAt: {},
      orderId: {
        startsWith: `${slug}-hx`,
      },
    },
  });
  return `${slug}-hx${(count + 1)?.toString()?.padStart(2, "0")}`;
}
export async function generateSalesSlug(type: SalesType, db, salesRep) {
  let orderId = null;
  while (!orderId) {
    const usr = salesRep
      ?.split(" ")
      ?.filter(Boolean)
      .map((a) => a[0]?.toUpperCase())
      .join("");
    const count = await db.count({
      where: {
        deletedAt: {},
        // ...withDeleted,
        type,
      },
    });
    const oid = `${count?.toString()?.padStart(5, "0")}${usr}`;
    if (
      (await db.count({
        where: { type, orderId: oid },
      })) == 0
    ) {
      orderId = oid as any;
    }
  }
  return orderId;
}
