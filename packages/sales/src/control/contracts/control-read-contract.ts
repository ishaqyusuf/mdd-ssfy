import type {
  ControlProjection,
  DispatchControlField,
  SalesControlField,
  SalesControlStatistic,
} from "../domain/types";

export type SalesControlListRow = {
  id: number;
  statistic: SalesControlStatistic;
};

export type DispatchControlListRow = {
  id: number;
  salesOrderId: number;
  statistic: SalesControlStatistic;
};

export interface ControlReadServiceContract {
  getSalesListControl<T extends { id: number }>(
    rows: T[],
    fields: SalesControlField[],
  ): Promise<Array<T & { control: ControlProjection<SalesControlField> }>>;

  getDispatchListControl<T extends { id: number; salesOrderId: number }>(
    rows: T[],
    fields: DispatchControlField[],
  ): Promise<Array<T & { control: ControlProjection<DispatchControlField> }>>;
}

