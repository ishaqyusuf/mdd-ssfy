import { describe, expect, it } from "bun:test";
import {
  getShelfLeafCategoryIds,
  swapWorkflowDoorComponent,
} from "./sales-form-core";

describe("sales-form-core exports", () => {
  it("exposes mobile workflow helpers through the core barrel", () => {
    expect(typeof getShelfLeafCategoryIds).toBe("function");
    expect(typeof swapWorkflowDoorComponent).toBe("function");
  });
});
