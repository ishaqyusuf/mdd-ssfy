import type { Db } from "@gnd/db";
import {
  IMPORT_STRATEGIES,
  type InventoryImportStrategyName,
} from "../../constants";
import { inventoryImportRunSchema, type InventoryImportRun } from "../../schema";
import { InventoryImportService as HandcraftedInventoryImportService } from "./strategies/handcrafted-importer";
import { InventoryImportService as OptimizedInventoryImportService } from "./strategies/optimized-importer";
import { resolveActiveInventoryImportScope } from "./resolve-active-inventory-import-scope";
import { syncInventorySuppliersFromDyke } from "../suppliers/suppliers";

type ImporterInstance = {
  importComponents(stepId: number): Promise<void>;
  readonly result: unknown;
};

export type InventoryImportExecution = {
  strategy: InventoryImportStrategyName;
  categoryId: number;
  result: {
    stepData?: {
      step?: {
        uid?: string | null;
      };
    };
    data?: {
      error?: unknown;
      skipped?: boolean;
      reason?: string;
      scope?: InventoryImportRun["scope"];
      tables?: Record<string, { tableResult?: { count?: number | null } }>;
    };
  };
};

export type InventoryImportComparison = {
  categoryId: number;
  preferredStrategy: InventoryImportStrategyName;
  handcrafted: InventoryImportExecution;
  optimized: InventoryImportExecution;
  analysis: {
    sameStepUid: boolean;
    tableCountDelta: Record<string, number>;
    handcraftedError: unknown;
    optimizedError: unknown;
  };
};

function createImporter(
  db: Db,
  strategy: InventoryImportStrategyName,
): ImporterInstance {
  if (strategy === "handcrafted") {
    return new HandcraftedInventoryImportService(db);
  }
  return new OptimizedInventoryImportService(db);
}

function extractTableCounts(result: any): Record<string, number> {
  const tables = result?.data?.tables ?? {};
  return Object.fromEntries(
    Object.entries(tables).map(([table, value]: [string, any]) => [
      table,
      Number(value?.tableResult?.count ?? 0),
    ]),
  );
}

function compareResults(
  handcrafted: InventoryImportExecution,
  optimized: InventoryImportExecution,
): InventoryImportComparison["analysis"] {
  const handcraftedCounts = extractTableCounts(handcrafted.result);
  const optimizedCounts = extractTableCounts(optimized.result);
  const tableKeys = Array.from(
    new Set([
      ...Object.keys(handcraftedCounts),
      ...Object.keys(optimizedCounts),
    ]),
  ).sort();

  return {
    sameStepUid:
      handcrafted.result.stepData?.step?.uid === optimized.result.stepData?.step?.uid,
    tableCountDelta: Object.fromEntries(
      tableKeys.map((key) => [
        key,
        Number(optimizedCounts[key] ?? 0) - Number(handcraftedCounts[key] ?? 0),
      ]),
    ),
    handcraftedError: handcrafted.result.data?.error,
    optimizedError: optimized.result.data?.error,
  };
}

export async function runInventoryImport(
  db: Db,
  input: InventoryImportRun,
): Promise<InventoryImportExecution | InventoryImportComparison> {
  const payload = inventoryImportRunSchema.parse(input);
  if (!payload.categoryId) {
    throw new Error("categoryId is required for inventory import runs");
  }

  if (payload.scope !== "all") {
    const scope = await resolveActiveInventoryImportScope(db);
    if (!scope.activeStepIds.includes(payload.categoryId)) {
      const step = await db.dykeSteps.findUnique({
        where: { id: payload.categoryId },
        select: { uid: true },
      });
      return {
        strategy: payload.strategy ?? IMPORT_STRATEGIES[1],
        categoryId: payload.categoryId,
        result: {
          stepData: {
            step: {
              uid: step?.uid ?? null,
            },
          },
          data: {
            skipped: true,
            reason: "step_outside_active_sales_settings_scope",
            scope: payload.scope,
            tables: {},
          },
        },
      };
    }
  }

  await syncInventorySuppliersFromDyke(db);

  if (payload.compare) {
    const handcrafted = createImporter(db, "handcrafted");
    await handcrafted.importComponents(payload.categoryId);
    const optimized = createImporter(db, "optimized");
    await optimized.importComponents(payload.categoryId);

    const handcraftedResult = {
      strategy: "handcrafted" as const,
      categoryId: payload.categoryId,
      result: handcrafted.result as InventoryImportExecution["result"],
    } satisfies InventoryImportExecution;
    const optimizedResult = {
      strategy: "optimized" as const,
      categoryId: payload.categoryId,
      result: optimized.result as InventoryImportExecution["result"],
    } satisfies InventoryImportExecution;

    return {
      categoryId: payload.categoryId,
      preferredStrategy: payload.strategy,
      handcrafted: handcraftedResult,
      optimized: optimizedResult,
      analysis: compareResults(handcraftedResult, optimizedResult),
    };
  }

  const strategy = payload.strategy ?? IMPORT_STRATEGIES[1];
  const importer = createImporter(db, strategy);
  await importer.importComponents(payload.categoryId);
  return {
    strategy,
    categoryId: payload.categoryId,
    result: importer.result as InventoryImportExecution["result"],
  };
}

export class InventoryImportService {
  #result: unknown = null;

  constructor(
    private readonly db: Db,
    private readonly options: Partial<InventoryImportRun> = {},
  ) {}

  public async importComponents(categoryId: number): Promise<void> {
    const scope = this.options.scope ?? "active";
    const strategy = this.options.strategy ?? "optimized";
    const compare = this.options.compare ?? false;
    const reset = this.options.reset ?? false;
    const source = this.options.source ?? "manual";
    this.#result = await runInventoryImport(this.db, {
      categoryId,
      scope,
      strategy,
      compare,
      reset,
      source,
    });
  }

  public get result() {
    return this.#result;
  }
}
