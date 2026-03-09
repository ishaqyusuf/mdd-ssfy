import type { Db } from "../../types";
import type { ControlReadServiceContract } from "../contracts/control-read-contract";
import type { DispatchControlField, SalesControlField } from "../domain/types";
import {
  DISPATCH_LIST_MINIMAL_FIELDS,
  projectDispatchListControl,
} from "../projections/dispatch-list-projection";
import {
  SALES_LIST_MINIMAL_FIELDS,
  projectSalesListControl,
} from "../projections/sales-list-projection";
import { withDispatchControl, withSalesControl } from "../../utils/with-sales-control";

export class ControlReadService implements ControlReadServiceContract {
  constructor(private readonly db: Db) {}

  async getSalesListControl<T extends { id: number }>(
    rows: T[],
    fields: SalesControlField[] = SALES_LIST_MINIMAL_FIELDS,
  ): Promise<Array<T & { control: ReturnType<typeof projectSalesListControl> }>> {
    const enriched = await withSalesControl(rows, this.db);
    return enriched.map((row) => {
      const { statistic, ...rest } = row as typeof row & { statistic: any };
      return {
        ...(rest as T),
        control: projectSalesListControl(statistic, fields),
      };
    });
  }

  async getDispatchListControl<T extends { id: number; salesOrderId: number }>(
    rows: T[],
    fields: DispatchControlField[] = DISPATCH_LIST_MINIMAL_FIELDS,
  ): Promise<Array<T & { control: ReturnType<typeof projectDispatchListControl> }>> {
    const enriched = await withDispatchControl(rows, this.db);
    return enriched.map((row) => {
      const { statistic, ...rest } = row as typeof row & { statistic: any };
      return {
        ...(rest as T),
        control: projectDispatchListControl(statistic, fields),
      };
    });
  }
}

export async function withSalesListControl<T extends { id: number }>(
  rows: T[],
  db: Db,
  fields: SalesControlField[] = SALES_LIST_MINIMAL_FIELDS,
) {
  const service = new ControlReadService(db);
  return service.getSalesListControl(rows, fields);
}

export async function withDispatchListControl<
  T extends { id: number; salesOrderId: number },
>(
  rows: T[],
  db: Db,
  fields: DispatchControlField[] = DISPATCH_LIST_MINIMAL_FIELDS,
) {
  const service = new ControlReadService(db);
  return service.getDispatchListControl(rows, fields);
}
