import { describe, expect, test } from "bun:test";

import { SalesBookFormIncludes } from "./db-utils";

describe("SalesBookFormIncludes", () => {
    test("hides soft-deleted shelf rows and form steps in normal mode", () => {
        const include = SalesBookFormIncludes({}) as any;

        expect(include.items.include.shelfItems.where).toEqual({
            deletedAt: null,
        });
        expect(include.items.include.formSteps.where).toEqual({
            deletedAt: null,
        });
    });

    test("allows restore mode to override deletedAt filters", () => {
        const include = SalesBookFormIncludes({ deletedAt: {} }) as any;

        expect(include.items.include.shelfItems.where).toEqual({
            deletedAt: {},
        });
        expect(include.items.include.formSteps.where).toEqual({
            deletedAt: {},
        });
    });
});
