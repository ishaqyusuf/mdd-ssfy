"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// @ts-expect-error packages/db typecheck does not include Bun test types.
const bun_test_1 = require("bun:test");
const client_1 = require("@prisma/client");
const soft_delete_1 = require("./soft-delete");
const client = {
    users: {
        fields: {
            id: {},
            deletedAt: {},
        },
    },
    webAuthSession: {
        fields: {
            id: {},
        },
    },
};
(0, bun_test_1.describe)("modelSupportsField", () => {
    (0, bun_test_1.test)("reads generated model delegate fields without Prisma DMMF", () => {
        (0, bun_test_1.expect)((0, soft_delete_1.modelSupportsField)(client, "Users", "deletedAt")).toBe(true);
        (0, bun_test_1.expect)((0, soft_delete_1.modelSupportsField)(client, "WebAuthSession", "deletedAt")).toBe(false);
    });
    (0, bun_test_1.test)("returns false for unknown models", () => {
        (0, bun_test_1.expect)((0, soft_delete_1.modelSupportsField)(client, "UnknownModel", "deletedAt")).toBe(false);
    });
    (0, bun_test_1.test)("matches the generated client model metadata", async () => {
        const prisma = new client_1.PrismaClient();
        const expected = client_1.Prisma.dmmf.datamodel.models
            .filter((model) => model.fields.some((field) => field.name === "deletedAt"))
            .map((model) => model.name)
            .sort();
        const actual = client_1.Prisma.dmmf.datamodel.models
            .filter((model) => (0, soft_delete_1.modelSupportsField)(prisma, model.name, "deletedAt"))
            .map((model) => model.name)
            .sort();
        (0, bun_test_1.expect)(actual).toEqual(expected);
        await prisma.$disconnect();
    });
});
(0, bun_test_1.describe)("applyDefaultSoftDeleteFilter", () => {
    (0, bun_test_1.test)("adds the active-row filter to models with deletedAt", () => {
        const args = {
            where: {
                email: "employee@example.com",
            },
        };
        (0, bun_test_1.expect)((0, soft_delete_1.applyDefaultSoftDeleteFilter)(client, "Users", args)).toEqual({
            where: {
                deletedAt: null,
                email: "employee@example.com",
            },
        });
    });
    (0, bun_test_1.test)("preserves an explicit deletedAt filter", () => {
        const deletedAt = {
            not: null,
        };
        const args = {
            where: {
                deletedAt,
            },
        };
        (0, bun_test_1.expect)((0, soft_delete_1.applyDefaultSoftDeleteFilter)(client, "Users", args)).toEqual({
            where: {
                deletedAt,
            },
        });
    });
    (0, bun_test_1.test)("does not change models without deletedAt", () => {
        const args = {
            where: {
                token: "session-token",
            },
        };
        (0, bun_test_1.expect)((0, soft_delete_1.applyDefaultSoftDeleteFilter)(client, "WebAuthSession", args)).toBe(args);
        (0, bun_test_1.expect)(args).toEqual({
            where: {
                token: "session-token",
            },
        });
    });
});
