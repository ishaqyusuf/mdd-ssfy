import { describe, expect, it } from "bun:test";
import { readFileSync } from "node:fs";

describe("HPT add-size parity", () => {
  it("keeps Add Size available before the first size row exists", () => {
    const source = readFileSync(
      new URL("./house-package-tool-panel.tsx", import.meta.url),
      "utf8",
    );
    const emptySummaryBranch = source.slice(
      source.indexOf("!props.summary.rows.length"),
      source.indexOf("!rowsForComponent.length"),
    );
    expect(emptySummaryBranch).toContain("HptAddSizeMenu");
    expect(emptySummaryBranch).toContain("onAddSize={props.onAddSize}");
  });

  it("keeps Add Size available when another door owns the only rows", () => {
    const source = readFileSync(
      new URL("./house-package-tool-panel.tsx", import.meta.url),
      "utf8",
    );
    const emptyFocusedBranch = source.slice(
      source.indexOf("!rowsForComponent.length"),
      source.indexOf(
        '<article className="overflow-hidden rounded-lg border bg-background">',
      ),
    );
    expect(emptyFocusedBranch).toContain("HptAddSizeMenu");
    expect(emptyFocusedBranch).toContain("Configure Sizes");
  });
});
