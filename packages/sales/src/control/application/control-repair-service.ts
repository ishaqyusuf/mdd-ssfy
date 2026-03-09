import type { Db } from "../../types";

export class ControlRepairService {
  constructor(private readonly db: Db) {}

  async rebuildFromSource(salesId: number) {
    // Step 2 skeleton: repair entrypoint only.
    return { ok: true, salesId };
  }

  async reconcileOrder(salesId: number) {
    return {
      ok: true,
      salesId,
      driftDetected: false,
    };
  }
}

