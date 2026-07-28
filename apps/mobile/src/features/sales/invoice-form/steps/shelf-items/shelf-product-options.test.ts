import { describe, expect, it } from "bun:test";
import {
  buildShelfProductSearchInput,
  formatShelfProductCategoryPath,
  formatShelfRowCategoryPath,
} from "./shelf-product-options";

const categories = [
  { id: 1, name: "Hardware", parentCategoryId: null, categoryId: null },
  { id: 2, name: "Hinges", parentCategoryId: 1, categoryId: 1 },
  { id: 3, name: "Locks", parentCategoryId: 1, categoryId: 1 },
] as any[];

describe("shelf product options", () => {
  it("formats search-result category tree subtitles from API paths", () => {
    expect(
      formatShelfProductCategoryPath(
        {
          categoryId: 2,
          parentCategoryId: 1,
          categoryPath: [
            { id: 1, name: "Hardware" },
            { id: 2, name: "Hinges" },
          ],
        } as any,
        categories,
      ),
    ).toBe("Hardware / Hinges");
  });

  it("formats search-result category tree subtitles from category ids", () => {
    expect(
      formatShelfProductCategoryPath(
        {
          categoryId: 3,
          parentCategoryId: 1,
        } as any,
        categories,
      ),
    ).toBe("Hardware / Locks");
  });

  it("formats selected shelf row category tree subtitles", () => {
    expect(
      formatShelfRowCategoryPath(
        {
          categoryId: 2,
          meta: {
            categoryIds: [1, 2],
          },
        },
        categories,
      ),
    ).toBe("Hardware / Hinges");
  });

  it("formats selected shelf row category tree subtitles from JSON metadata", () => {
    expect(
      formatShelfRowCategoryPath(
        {
          categoryId: 2,
          meta: JSON.stringify({
            categoryIds: [1, 2],
            shelfParentCategoryId: 1,
          }),
        },
        categories,
      ),
    ).toBe("Hardware / Hinges");
  });

  it("falls back when shelf category metadata is missing", () => {
    expect(
      formatShelfRowCategoryPath(
        {
          categoryId: null,
          meta: null,
        },
        categories,
      ),
    ).toBe("Uncategorized");
  });

  it("uses recent-only top 15 shelf search params for blank picker search", () => {
    expect(buildShelfProductSearchInput("   ")).toEqual({
      query: "",
      selectedIds: [],
      limit: 15,
    });
  });

  it("uses typed shelf search params without selected-product padding", () => {
    expect(buildShelfProductSearchInput(" rail ")).toEqual({
      query: "rail",
      selectedIds: [],
      limit: 20,
    });
  });
});
