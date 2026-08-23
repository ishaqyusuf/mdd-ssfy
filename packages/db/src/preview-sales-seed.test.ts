// @ts-expect-error packages/db typecheck does not include Bun test types.
import { describe, expect, test } from "bun:test";
import { Prisma } from "@prisma/client";
import {
	assertSafePreviewSeedConnections,
	databaseCredentialFingerprint,
	normalizeWriteValue,
	parsePreviewSalesSeedArgs,
	sanitizePreviewRow,
	selectScenarioBalancedOrders,
} from "./preview-sales-seed";

const localUrl = "mysql://root:local@127.0.0.1:3306/gnd";
const previewUrl =
	"mysql://preview-user:preview-password@aws.connect.psdb.cloud/gndprodesk?sslaccept=strict";

describe("preview sales seed safety", () => {
	test("requires a local source and PlanetScale target", () => {
		const options = parsePreviewSalesSeedArgs([
			"--source-url",
			localUrl,
			"--target-url",
			previewUrl,
			"--dry-run",
		]);
		expect(assertSafePreviewSeedConnections(options)).toBe(
			databaseCredentialFingerprint(previewUrl),
		);
		expect(() =>
			assertSafePreviewSeedConnections({ ...options, sourceUrl: previewUrl }),
		).toThrow("source must be a local database");
		expect(() =>
			assertSafePreviewSeedConnections({ ...options, targetUrl: localUrl }),
		).toThrow("target must be PlanetScale");
	});

	test("requires the dry-run credential fingerprint before writes", () => {
		const options = parsePreviewSalesSeedArgs([
			"--source-url",
			localUrl,
			"--target-url",
			previewUrl,
		]);
		expect(() => assertSafePreviewSeedConnections(options)).toThrow(
			"Writes require --expect-target-fingerprint",
		);
		expect(() =>
			assertSafePreviewSeedConnections({
				...options,
				expectedTargetFingerprint: "wrong",
			}),
		).toThrow("fingerprint does not match");
	});

	test("enforces a 100-200 order dataset", () => {
		expect(() =>
			parsePreviewSalesSeedArgs([
				"--source-url",
				localUrl,
				"--target-url",
				previewUrl,
				"--limit",
				"99",
			]),
		).toThrow("between 100 and 200");
		expect(
			parsePreviewSalesSeedArgs([
				"--source-url",
				localUrl,
				"--target-url",
				previewUrl,
				"--limit",
				"200",
				"--dry-run",
			]).limit,
		).toBe(200);
	});
});

test("scenario selection distributes rows before filling deep groups", () => {
	const rows = [
		...Array.from({ length: 5 }, (_, id) => ({
			id,
			status: "A",
			prodStatus: "pending",
		})),
		...Array.from({ length: 5 }, (_, id) => ({
			id: id + 10,
			status: "B",
			prodStatus: "done",
		})),
	];
	const selected = selectScenarioBalancedOrders(rows, 4);
	expect(selected.map((row) => row.status)).toEqual(["A", "B", "A", "B"]);
});

test("sanitization preserves workflow metrics while removing customer PII and auth tokens", () => {
	const customer = sanitizePreviewRow("Customers", {
		id: 42,
		name: "Real Customer",
		email: "real@example.com",
		phoneNo: "123",
		meta: { email: "nested@example.com", preference: "keep" },
	});
	expect(customer.name).toBe("Preview Customer 42");
	expect(customer.email).toBe("preview.customer.42@example.test");
	expect(customer.meta).toEqual({
		email: "preview@example.test",
		preference: "keep",
	});

	const order = sanitizePreviewRow("SalesOrders", {
		id: 7,
		orderId: "GND-7",
		status: "pending",
		grandTotal: 900,
		instruction: "private",
	});
	expect(order).toMatchObject({
		title: "Preview Order GND-7",
		status: "pending",
		grandTotal: 900,
		instruction: null,
	});

	const user = sanitizePreviewRow("Users", {
		id: 3,
		email: "local@example.test",
		password: "hash",
		rememberToken: "secret",
	});
	expect(user).toMatchObject({
		email: "local@example.test",
		password: "hash",
		rememberToken: null,
	});
});

test("decimal database values are written as SQL-compatible strings, not JSON strings", () => {
	expect(normalizeWriteValue(new Prisma.Decimal("5242.95"))).toBe("5242.95");
});
