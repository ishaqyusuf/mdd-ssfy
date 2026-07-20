// @ts-expect-error packages/db typecheck does not include Bun test types.
import { describe, expect, test } from "bun:test";
import { Prisma, PrismaClient } from "@prisma/client";
import {
	applyDefaultSoftDeleteFilter,
	modelSupportsField,
} from "./soft-delete";

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

describe("modelSupportsField", () => {
	test("reads generated model delegate fields without Prisma DMMF", () => {
		expect(modelSupportsField(client, "Users", "deletedAt")).toBe(true);
		expect(modelSupportsField(client, "WebAuthSession", "deletedAt")).toBe(
			false,
		);
	});

	test("returns false for unknown models", () => {
		expect(modelSupportsField(client, "UnknownModel", "deletedAt")).toBe(false);
	});

	test("matches the generated client model metadata", async () => {
		const prisma = new PrismaClient();
		const expected = Prisma.dmmf.datamodel.models
			.filter((model) =>
				model.fields.some((field) => field.name === "deletedAt"),
			)
			.map((model) => model.name)
			.sort();
		const actual = Prisma.dmmf.datamodel.models
			.filter((model) => modelSupportsField(prisma, model.name, "deletedAt"))
			.map((model) => model.name)
			.sort();

		expect(actual).toEqual(expected);
		await prisma.$disconnect();
	});
});

describe("applyDefaultSoftDeleteFilter", () => {
	test("adds the active-row filter to models with deletedAt", () => {
		const args = {
			where: {
				email: "employee@example.com",
			},
		};

		expect(applyDefaultSoftDeleteFilter(client, "Users", args)).toEqual({
			where: {
				deletedAt: null,
				email: "employee@example.com",
			},
		});
	});

	test("preserves an explicit deletedAt filter", () => {
		const deletedAt = {
			not: null,
		};
		const args = {
			where: {
				deletedAt,
			},
		};

		expect(applyDefaultSoftDeleteFilter(client, "Users", args)).toEqual({
			where: {
				deletedAt,
			},
		});
	});

	test("does not change models without deletedAt", () => {
		const args = {
			where: {
				token: "session-token",
			},
		};

		expect(applyDefaultSoftDeleteFilter(client, "WebAuthSession", args)).toBe(
			args,
		);
		expect(args).toEqual({
			where: {
				token: "session-token",
			},
		});
	});
});
