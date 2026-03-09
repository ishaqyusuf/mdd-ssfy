import type { QtyControlType } from "../../types";

export type QtyStat = {
  lhQty: number;
  rhQty: number;
  qty: number;
  total: number;
};

export type ControlAggregate = {
  salesId: number;
  itemControlUid: string;
  produceable: boolean;
  shippable: boolean;
  stats: Partial<Record<QtyControlType, QtyStat>>;
};

export type ControlDispatchStatus =
  | "queue"
  | "in progress"
  | "completed"
  | "cancelled"
  | "unknown";

export type ControlProductionStatus =
  | "pending"
  | "in progress"
  | "completed"
  | "N/A"
  | "unknown";

export type SalesControlStatistic = {
  qty: QtyStat;
  prodAssigned: QtyStat;
  prodCompleted: QtyStat;
  dispatchAssigned: QtyStat;
  dispatchInProgress: QtyStat;
  dispatchCompleted: QtyStat;
  dispatchCancelled: QtyStat;
  pendingAssignment: QtyStat;
  pendingSubmission: QtyStat;
  packables: QtyStat;
  pendingPacking: QtyStat;
  pendingDispatch: QtyStat;
  packed: QtyStat;
  productionStatus: ControlProductionStatus;
  dispatchStatus: ControlDispatchStatus;
};

export type SalesControlField =
  | "productionStatus"
  | "dispatchStatus"
  | "packables"
  | "pendingDispatch"
  | "pendingPacking"
  | "packed"
  | "prodAssigned"
  | "prodCompleted";

export type DispatchControlField =
  | "dispatchStatus"
  | "packables"
  | "pendingPacking"
  | "packed"
  | "dispatchAssigned"
  | "dispatchInProgress"
  | "dispatchCompleted";

export type ControlProjection<TField extends string> = {
  dispatchStatus?: ControlDispatchStatus;
  productionStatus?: ControlProductionStatus;
  packed?: QtyStat;
  pendingPacking?: QtyStat;
  pendingDispatch?: QtyStat;
  packables?: QtyStat;
  prodAssigned?: QtyStat;
  prodCompleted?: QtyStat;
  dispatchAssigned?: QtyStat;
  dispatchInProgress?: QtyStat;
  dispatchCompleted?: QtyStat;
  selectedFields: TField[];
};
