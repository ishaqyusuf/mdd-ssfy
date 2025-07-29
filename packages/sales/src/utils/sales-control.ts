import type {
  ItemControl,
  ItemControlData,
  ItemControlTypes,
  Qty,
  QtyControlByType,
  QtyControlType,
  SalesDispatchStatus,
} from "../types";
import type { Prisma } from "@gnd/db";
import { percent, sum } from "@gnd/utils";
import { isEqual } from "lodash";
import { qtyControlsByType } from "./utils";
import { GetSalesItemControllables } from "../sales-control";
export const composeQtyMatrix = (rh, lh, qty) => {
  if (!qty || rh || lh) qty = sum([rh, lh]);
  return { rh, lh, qty, noHandle: !rh && !lh };
};
export const recomposeQty = (q: Qty) => ({
  noHandle: !q.lh && !q.rh,
  rh: q.rh,
  lh: q.lh,
  qty: q.rh || q.lh ? sum([q.rh, q.lh]) : q.qty,
});
export function pickQtyFrom(pick: Qty, fromBasket: Qty) {
  pick = recomposeQty(pick);
  fromBasket = recomposeQty(fromBasket);

  const picked: Qty = { lh: 0, rh: 0, qty: 0 };
  const pendingPick: Qty = { lh: 0, rh: 0, qty: 0 };
  const remainder: Qty = {
    lh: fromBasket.lh,
    rh: fromBasket.rh,
    qty: fromBasket.qty,
  };

  let remainingPick = pick.qty;

  // Pick from RH first
  if (fromBasket.rh && remainingPick > 0) {
    const take = Math.min(fromBasket.rh, remainingPick);
    picked.rh = take;
    remainder.rh = fromBasket.rh - take;
    remainingPick -= take;
  }

  // Pick from LH next
  if (fromBasket.lh && remainingPick > 0) {
    const take = Math.min(fromBasket.lh, remainingPick);
    picked.lh = take;
    remainder.lh = fromBasket.lh - take;
    remainingPick -= take;
  }

  // Calculate final qty values
  picked.qty = sum([picked.rh, picked.lh]);
  remainder.qty = sum([remainder.rh, remainder.lh]);

  // Anything left unpicked is pendingPick
  if (remainingPick > 0) {
    pendingPick.qty = remainingPick;
    pendingPick.noHandle = true;
  }

  // Set handle flags
  picked.noHandle = !picked.rh && !picked.lh;
  remainder.noHandle = !remainder.rh && !remainder.lh;

  return {
    picked: picked.qty > 0 ? picked : null,
    pendingPick: pendingPick.qty > 0 ? pendingPick : null,
    remainder: remainder.qty > 0 ? remainder : null,
  };
}

export function qtyMatrixDifference(a: Qty, b: Qty) {
  let res: Qty = {
    noHandle: a.noHandle,
  } as any;
  ["rh", "lh", "qty"].map((k) => (res[k] = sum([a[k], b[k] * -1])));
  return res;
}
export function qtyMatrixSum(...qties: Qty[]): Qty {
  qties = qties.map(({ lh, rh, qty }) => composeQtyMatrix(rh, lh, qty));
  if (!qties) return {} as any;
  let res: Qty = {
    noHandle: qties?.some((a) => a.noHandle),
  } as any;
  qties?.map((a) => {
    ["rh", "lh", "qty"].map((k) => (res[k] = sum([a[k], res[k]])));
    return res;
  });
  return res;
}

export function transformQtyHandle({ lhQty: lh, rhQty: rh, qty }): Qty {
  return { lh, rh, qty, noHandle: !rh && !lh };
}
export function laborRate(rate, override) {
  return override ?? (override === 0 ? 0 : rate);
}

export function negativeQty({ lh, rh, qty, ...rest }: Qty): Qty {
  return {
    ...rest,
    lh: lh * -1,
    rh: rh * -1,
    qty: qty * -1,
  };
}
export function composeSalesItemControlStat(
  // uid,
  // qty: Qty,
  item: ItemControlData,
  _order
  // { production, shipping },
) {
  const {
    controlUid: uid,
    qty,
    itemConfig: { production } = {},
    doorId,
    hptId,
    dim,
    itemId,
  } = item;
  const order = _order as Prisma.SalesOrdersGetPayload<{
    select: {
      deliveries: {
        select: {
          status: true;
          items: true;
        };
      };
      assignments: {
        select: {
          id: true;
          itemId: true;
          shelfItemId: true;
          salesDoorId: true;
          qtyAssigned: true;
          lhQty: true;
          rhQty: true;
          salesItemControlUid: true;
          submissions: {
            select: {
              id: true;
              qty: true;
              lhQty: true;
              rhQty: true;
            };
          };
        };
      };
    };
  }>;
  const assignments = order.assignments
    .filter(
      (a) =>
        a.itemId == item.itemId &&
        a.salesDoorId == item.doorId &&
        a.shelfItemId == item.shelfId
    )
    .filter((a) => {
      if (a.salesDoorId) return true;
      if (!a.salesItemControlUid)
        a.salesItemControlUid = generateItemControlUid({
          shelfId: a.shelfItemId,
          itemId: a.itemId,
          doorId: a.salesDoorId,
          hptId: item.hptId,
          dim: item.dim,
        } as any);
      return a.salesItemControlUid == item.controlUid;
    });

  // throw new Error("...");
  const assigned = qtyMatrixSum(
    ...assignments.map(({ lhQty: lh, rhQty: rh, qtyAssigned: qty }) => ({
      lh,
      rh,
      qty,
    }))
  );
  const submitted = qtyMatrixSum(
    ...assignments
      .map((a) =>
        a.submissions.map(({ lhQty: lh, rhQty: rh, qty }) => ({
          lh,
          rh,
          qty,
        }))
      )
      .flat()
  );
  const deliverables = assignments
    .map((assignment) => {
      return assignment.submissions.map((s) => {
        let submitted = transformQtyHandle(s);
        const delivered = qtyMatrixSum(
          ...order.deliveries
            .filter((d) => (d.status as SalesDispatchStatus) !== "cancelled")
            .map((d) =>
              qtyMatrixSum(
                ...d.items
                  .filter((i) => i.orderProductionSubmissionId == s.id)
                  .map(transformQtyHandle)
              )
            )
            .flat()
        );
        return {
          submissionId: s.id,
          submitted,
          delivered,
          available: qtyMatrixDifference(submitted, delivered),
        };
      });
    })
    .flat();
  const pendingAssignment = qtyMatrixDifference(qty, assigned);
  const pendingProduction = qtyMatrixDifference(assigned, submitted);
  const submissionIds = assignments
    .map((a) => a.submissions.map((s) => s.id))
    .flat();
  const deliveries = order.deliveries
    .map((d) =>
      d.items
        .map(({ qty, lhQty: lh, rhQty: rh, orderProductionSubmissionId }) => ({
          qty,
          lh,
          rh,
          status: d.status as SalesDispatchStatus,
          orderProductionSubmissionId,
        }))
        .filter((a) => submissionIds.includes(a.orderProductionSubmissionId!))
    )
    .flat();
  const dispatch = {
    queued: qtyMatrixSum(
      ...(deliveries.filter((a) => a.status == "queue") as any)
    ),
    inProgress: qtyMatrixSum(
      ...(deliveries.filter((a) => a.status == "in progress") as any)
    ),
    completed: qtyMatrixSum(
      ...(deliveries.filter((a) => a.status == "completed") as any)
    ),
    cancelled: qtyMatrixSum(
      ...(deliveries.filter((a) => a.status == "cancelled") as any)
    ),
  };
  const pendingDispatch = qtyMatrixDifference(
    qty,
    qtyMatrixSum(dispatch.queued, dispatch.inProgress, dispatch.completed)
  );

  const availableDispatch = qtyMatrixDifference(
    !production ? qty : submitted,
    qtyMatrixSum(dispatch.queued, dispatch.inProgress, dispatch.completed)
  );
  const pendingSubmissions = assignments
    .map((assignment) => {
      const pendingSubmission = qtyMatrixDifference(
        {
          lh: assignment.lhQty,
          rh: assignment.rhQty,
          qty: assignment.qtyAssigned,
        },
        qtyMatrixSum(
          ...assignment.submissions.map((s) => ({
            lh: s.lhQty,
            rh: s.rhQty,
            qty: s.qty,
          }))
        )
      );
      return {
        qty: pendingSubmission,
        assignmentId: assignment.id,
      };
    })
    .filter((a) => a.qty.qty);

  const stats = {
    qty,
    prodAssigned: assigned,
    prodCompleted: submitted,
    dispatchAssigned: dispatch.queued,
    dispatchCancelled: dispatch.cancelled,
    dispatchCompleted: dispatch.completed,
    dispatchInProgress: dispatch.inProgress,
  } as { [k in QtyControlType]: Qty };
  return {
    // orderAssignments: order.assignments,
    assignmentUidUpdates: assignments
      .filter((a) => a.salesItemControlUid != item.controlUid)
      .map((a) => a.id),
    stats,
    submissionIds,
    deliverables,
    deliveredQty: qtyMatrixSum(
      stats.dispatchAssigned,
      stats.dispatchCompleted,
      stats.dispatchInProgress
    )?.qty,
    submitQty: submitted.qty,
    pendingSubmissions,
    assignment: {
      pending: pendingAssignment,
      ids: assignments.map((a) => a.id),
    },
    production: {
      pending: pendingProduction,
    },
    dispatch: {
      pending: pendingDispatch,
      available: availableDispatch,
    },
  };
}

export function itemControlUid(props: ItemControl) {
  const stacks = [props.type];
  if (props.doorId) {
    stacks.push(props.doorId);
    stacks.push(props.dim);
  } else if (props.shelfId) {
    stacks.push(props.shelfId);
  } else {
    stacks.push(props.itemId);
    if (props.hptId) stacks.push(props.hptId);
  }
  return stacks.join("-");
}
export function itemControlUidObject(str) {
  const [type, x, ...y]: [ItemControlTypes, string, string[]] = str.split("-");
  const obj: ItemControl = { type };
  if (type == "door") {
    obj.doorId = +x;
    obj.dim = y.join("-");
  } else {
    obj.itemId = +x;
    if (type == "molding") obj.hptId = +y?.[0];
  }
  return obj;
}
export function shelfItemControlUid(shelfId) {
  return itemControlUid({
    type: "shelf",
    shelfId,
  });
}
export function itemItemControlUid(itemId) {
  return itemControlUid({
    type: "item",
    itemId,
  });
}
export function doorItemControlUid(doorId, dim) {
  return itemControlUid({
    type: "door",
    doorId,
    dim,
  });
}
export function generateItemControlUid({
  itemId = null,
  hptId = null,
  doorId = null,
  dim = null,
  shelfId = null,
}) {
  if (shelfId) return shelfItemControlUid(shelfId);
  if (doorId) return doorItemControlUid(doorId, dim);
  if (hptId) return mouldingItemControlUid(itemId, hptId);
  return itemControlUid(itemId!);
}
export function mouldingItemControlUid(itemId, hptId) {
  return itemControlUid({
    type: "molding",
    itemId,
    hptId,
  });
}

type ItemControlComposer = {
  uid;
  qtyControls: QtyControlByType["qty"][];
  data: Prisma.SalesItemControlCreateManyInput;
};
interface ComposeQtyControlProps {
  order: GetSalesItemControllables;
  itemId: number;
  doorId?: number;
  controlUid: string;
  lh?;
  rh?;
  qty?;
  produceable;
  shippable;
}

function composeQtyControl(props: ComposeQtyControlProps) {
  const { produceable, shippable } = props;
  const totalQty = props.qty ? props.qty : sum([props.lh, props.rh]);
  if (!totalQty) return [];
  const previousControls = qtyControlsByType(
    props.order?.itemControls?.filter((c) => c.uid == props.controlUid) as any
  );

  const controls: QtyControlByType = {} as any;
  const totalProduceable = props.produceable ? totalQty : 0;
  const totalShippable = props.shippable ? totalQty : 0;

  controls.qty = {
    qty: props.qty,
    lh: props.lh,
    rh: props.rh,
    type: "qty",
    itemControlUid: props.controlUid,
    autoComplete: previousControls?.qty?.autoComplete,
    total: totalQty,
    itemTotal: totalQty,
  };
  let assignments = props.order.assignments.filter((a) =>
    props.doorId ? a.salesDoorId == props.doorId : a.itemId == props.itemId
  );
  const singleHandle = assignments?.every((a) => !a.lhQty && !a.rhQty);
  controls.prodAssigned = {
    lh: sum(assignments, "lhQty"),
    rh: sum(assignments, "rhQty"),
    qty: singleHandle ? sum(assignments, "qtyAssigned") : 0,
    type: "prodAssigned",
    itemControlUid: props.controlUid,
    autoComplete: previousControls?.prodAssigned?.autoComplete,
    itemTotal: totalProduceable,
  };
  const submissions = assignments.map((a) => a.submissions).flat();
  controls.prodCompleted = {
    lh: sum(submissions, "lhQty"),
    rh: sum(submissions, "rhQty"),
    qty: singleHandle ? sum(submissions, "qty") : 0,
    type: "prodCompleted",
    itemControlUid: props.controlUid,
    autoComplete: previousControls?.prodCompleted?.autoComplete,
    itemTotal: totalProduceable,
  };
  const deliveries = props.order.deliveries;
  const dispatches = submissions.map((s) => s.itemDeliveries).flat();
  function registerDispatch(
    status: SalesDispatchStatus,
    controlType: QtyControlType
  ) {
    const dispatchItems = dispatches.filter((d) => {
      const _status =
        d.status ||
        deliveries.find((del) => del.id == d.orderDeliveryId)?.status;
      switch (status) {
        case "queue":
          return _status == status || !_status;
          break;
        default:
          return _status == status;
          break;
      }
    });
    controls[controlType] = {
      lh: sum(dispatchItems, "lhQty"),
      rh: sum(dispatchItems, "rhQty"),
      qty: singleHandle ? sum(dispatchItems, "qty") : 0,
      type: controlType,
      itemControlUid: props.controlUid,
      autoComplete: previousControls?.[controlType]?.autoComplete,
      itemTotal: totalShippable,
    };
  }
  registerDispatch("cancelled", "dispatchCancelled");
  registerDispatch("completed", "dispatchCompleted");
  registerDispatch("in progress", "dispatchInProgress");
  registerDispatch("queue", "dispatchAssigned");
  return Object.values(controls).map((control) => {
    const _totalQty = control.autoComplete
      ? control.itemTotal
      : sum([control.qty, control.lh, control.rh]);
    (control as any).total = _totalQty;
    switch (control.type) {
      case "prodAssigned":
      case "prodCompleted":
        if (props.produceable)
          control.percentage = percent(_totalQty, control.itemTotal);
        else control.percentage = 0;
        break;
      case "qty":
      case "dispatchCancelled":
        break;
      default:
        if (props.shippable)
          control.percentage = percent(_totalQty, control.itemTotal);
        else control.percentage = 0;
        break;
    }
    // control.itemTotal = totalQty;
    // control.percentage = percent(_totalQty, control.itemTotal);
    return control;
  });
}
export function composeControls(order: GetSalesItemControllables) {
  const controls: {
    uid;
    itemId;
    orderId;
    qtyControls: QtyControlByType["qty"][];
    data: Prisma.SalesItemControlUpdateInput;
  }[] = [];
  order.items.map((item) => {
    if (item?.housePackageTool) {
      if (item.housePackageTool?.doors?.length) {
        item.housePackageTool?.doors.map((door) => {
          let controlUid = doorItemControlUid(door.id, door.dimension);
          controls.push({
            uid: controlUid,
            itemId: item.id,
            orderId: order.id,
            qtyControls: composeQtyControl({
              order,
              controlUid,
              itemId: item.id,
              lh: door.lhQty,
              rh: door.rhQty,
              qty: !door.lhQty && !door.rhQty ? door.totalQty : 0,
              doorId: door.id,
              shippable: item.itemStatConfig?.shipping,
              produceable: item.itemStatConfig?.production,
            }),
            data: {
              subtitle: `${door.dimension}`,
              shippable: item.itemStatConfig?.shipping,
              produceable: item.itemStatConfig?.production,
            },
          });
        });
      } else {
        let controlUid = mouldingItemControlUid(
          item.id,
          item.housePackageTool.id
        );
        controls.push({
          uid: controlUid,
          itemId: item.id,
          orderId: order.id,
          data: {
            shippable: item.itemStatConfig?.shipping,
            produceable: item.itemStatConfig?.production,
            title: `${
              item.housePackageTool?.stepProduct?.name ||
              item.housePackageTool?.stepProduct?.product?.title
            }`,
          },
          qtyControls: composeQtyControl({
            order,
            controlUid,
            itemId: item.id,
            qty: item.qty,
            shippable: item.itemStatConfig?.shipping,
            produceable: item.itemStatConfig?.production,
          }),
        });
      }
    } else {
      let controlUid = itemItemControlUid(item.id);
      controls.push({
        uid: controlUid,
        itemId: item.id,
        orderId: order.id,
        data: {
          shippable: true,
          produceable: true,
          title: `${item.description}`,
          subtitle: [item.swing]?.filter(Boolean)?.join(" | "),
        },
        qtyControls: composeQtyControl({
          order,
          controlUid,
          itemId: item.id,
          qty: item.qty,
          shippable: true,
          produceable: true,
        }),
      });
    }
  });
  let response: {
    uid;
    create?: Prisma.SalesItemControlCreateInput;
    update?: Prisma.SalesItemControlUpdateInput;
    // qtyControls: Prisma.QtyControlCreateManyInput[];
  }[] = [];
  controls.map((control) => {
    const prevControl = order.itemControls.find((c) => c.uid == control.uid);
    if (prevControl) {
      let {
        qtyControls,
        salesId,
        orderItemId,
        deletedAt,
        uid,
        sectionTitle,
        ...rest
      } = prevControl;
      const equals = isEqual(rest, control.data);
      response.push({
        uid: control.uid,

        update: {
          // uid: control.uid,
          produceable: control.data.produceable,
          title: control.data.title,
          subtitle: control.data.subtitle,
          shippable: control.data.shippable,
          qtyControls: {
            createMany: {
              data: control.qtyControls.map((qty) => {
                const prevQty = qtyControls.find((c) => c.type == qty.type);

                qty.autoComplete = prevQty?.autoComplete;
                if (prevQty?.autoComplete) qty.percentage = 100;
                const { itemControlUid, ...createData } = qty;
                return createData;
              }),
            },
          },
        },
      });
    } else
      response.push({
        uid: control.uid,
        create: {
          uid: control.uid,
          ...(control.data as any),
          item: {
            connect: { id: control.itemId },
          },
          sales: {
            connect: { id: control.orderId },
          },
          qtyControls: {
            createMany: {
              data: control.qtyControls.map((cont) => {
                const { itemControlUid, ...rest } = cont;
                return rest;
              }),
            },
          },
        },
      });
  });
  return response;
}
const hiddenDisplaySteps = [
  "Door",
  "Item Type",
  "Moulding",
  "House Package Tool",
  "Height",
  "Hand",
  "Width",
];
export const composeStepFormDisplay = (
  stepForms: any[],
  sectionTitle: any = null
) => {
  const configs = stepForms
    ?.map((stepForm) => {
      let color: any = null;
      let label = stepForm?.step?.title?.toLowerCase();
      let value = stepForm?.value?.toLowerCase();
      let hidden =
        hiddenDisplaySteps?.map((a) => a.toLowerCase()).includes(value) ||
        !value;
      if (label == "item type" && !sectionTitle) sectionTitle = value;
      let red = [
        label == "hinge finish" && !value?.startsWith("us15"),
        label?.includes("jamb") && !value?.startsWith("4-5/8"),
      ];
      if (red.some(Boolean)) color = "red";
      return {
        color,
        label,
        value,
        hidden,
      };
    })
    .filter((a) => !a.hidden);
  return {
    configs,
    sectionTitle,
  };
};
