import { db } from "@gnd/db";
import {
	type CreateStoredDocumentRecordInput,
	type StoredDocumentRepository,
	type UpdateStoredDocumentRecordInput,
	buildOwnerDocumentFolder,
	createDocumentRegistry,
	createDocumentService,
	createVercelBlobProvider,
} from "@gnd/documents";
import { getSubscribersForNotificationType } from "@gnd/notifications/channel-subscribers";
import {
	type DailyPaymentsReport,
	buildDailyPaymentsReport,
} from "@gnd/sales/payment-system";
import { getSettingAction } from "@gnd/settings";
import { getRecipient } from "@gnd/utils/envs";
import { logger, schedules, task } from "@trigger.dev/sdk/v3";
import { put } from "@vercel/blob";
import { nanoid } from "nanoid";
import xlsx from "node-xlsx";
import { Resend } from "resend";
import type { TaskName } from "../../schema";
import {
	getTaskEventConfigFromMeta,
	getTaskEventDefaultConfig,
} from "../../task-events/registry";

const EVENT_NAME = "sales-daily-payment-report-schedule" as const;
const EXCEL_MIME =
	"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

type RunType = "scheduled" | "now" | "test";
type ReportWindow = "today" | "previous_day";

type DailyPaymentsReportFilter = {
	timezone: string;
	reportWindow: ReportWindow;
	notificationChannelName: string;
};

type StoredReportArtifact = {
	documentId: string;
	filename: string;
	pathname: string;
	url: string | null;
	contentType: string;
	size: number | null;
};

function createStoredDocumentRepository(): StoredDocumentRepository {
	type FindCurrentByOwnerInput = {
		ownerType: string;
		ownerId: string;
		kind: string;
	};
	type ClearCurrentByOwnerInput = FindCurrentByOwnerInput & {
		excludeId?: string;
	};

	return {
		create(input: CreateStoredDocumentRecordInput) {
			return db.storedDocument.create({
				data: input,
			});
		},
		update(input: UpdateStoredDocumentRecordInput) {
			const { id, ...data } = input;
			return db.storedDocument.update({
				where: { id },
				data,
			});
		},
		findCurrentByOwner(input: FindCurrentByOwnerInput) {
			return db.storedDocument.findFirst({
				where: {
					ownerType: input.ownerType,
					ownerId: input.ownerId,
					kind: input.kind,
					isCurrent: true,
					deletedAt: null,
				},
			});
		},
		async clearCurrentByOwner(input: ClearCurrentByOwnerInput) {
			await db.storedDocument.updateMany({
				where: {
					ownerType: input.ownerType,
					ownerId: input.ownerId,
					kind: input.kind,
					isCurrent: true,
					deletedAt: null,
					...(input.excludeId ? { id: { not: input.excludeId } } : {}),
				},
				data: {
					isCurrent: false,
				},
			});
		},
	};
}

function money(value: number) {
	return Math.round((Number(value) || 0) * 100) / 100;
}

function formatMoney(value: number) {
	return money(value);
}

function formatDateForFile(date: Date, timezone: string) {
	return new Intl.DateTimeFormat("en-CA", {
		timeZone: timezone,
		year: "numeric",
		month: "2-digit",
		day: "2-digit",
	}).format(date);
}

function formatDateTime(date: Date, timezone: string) {
	return new Intl.DateTimeFormat("en-US", {
		timeZone: timezone,
		year: "numeric",
		month: "2-digit",
		day: "2-digit",
		hour: "2-digit",
		minute: "2-digit",
		hour12: false,
	}).format(date);
}

function getTimeZoneParts(date: Date, timezone: string) {
	const parts = new Intl.DateTimeFormat("en-US", {
		timeZone: timezone,
		year: "numeric",
		month: "2-digit",
		day: "2-digit",
		hour: "2-digit",
		minute: "2-digit",
		second: "2-digit",
		hour12: false,
	}).formatToParts(date);

	const value = (type: Intl.DateTimeFormatPartTypes) =>
		Number(parts.find((part) => part.type === type)?.value || 0);

	return {
		year: value("year"),
		month: value("month"),
		day: value("day"),
		hour: value("hour") === 24 ? 0 : value("hour"),
		minute: value("minute"),
		second: value("second"),
	};
}

function zonedTimeToUtc(
	input: {
		year: number;
		month: number;
		day: number;
		hour?: number;
		minute?: number;
		second?: number;
	},
	timezone: string,
) {
	const utcGuess = new Date(
		Date.UTC(
			input.year,
			input.month - 1,
			input.day,
			input.hour || 0,
			input.minute || 0,
			input.second || 0,
		),
	);
	const parts = getTimeZoneParts(utcGuess, timezone);
	const asUtc = Date.UTC(
		parts.year,
		parts.month - 1,
		parts.day,
		parts.hour,
		parts.minute,
		parts.second,
	);
	const desiredUtc = Date.UTC(
		input.year,
		input.month - 1,
		input.day,
		input.hour || 0,
		input.minute || 0,
		input.second || 0,
	);
	return new Date(utcGuess.getTime() + desiredUtc - asUtc);
}

function addLocalDays(
	date: { year: number; month: number; day: number },
	days: number,
) {
	const next = new Date(Date.UTC(date.year, date.month - 1, date.day + days));
	return {
		year: next.getUTCFullYear(),
		month: next.getUTCMonth() + 1,
		day: next.getUTCDate(),
	};
}

function resolveReportPeriod(input: {
	now: Date;
	timezone: string;
	reportWindow: ReportWindow;
}) {
	const today = getTimeZoneParts(input.now, input.timezone);
	const reportDate =
		input.reportWindow === "previous_day"
			? addLocalDays(today, -1)
			: { year: today.year, month: today.month, day: today.day };
	const nextDate = addLocalDays(reportDate, 1);
	const from = zonedTimeToUtc(reportDate, input.timezone);
	const nextStart = zonedTimeToUtc(nextDate, input.timezone);

	return {
		from,
		to: new Date(nextStart.getTime() - 1000),
		reportDate: formatDateForFile(from, input.timezone),
	};
}

function buildWorkbook(report: DailyPaymentsReport) {
	const summary = [
		["Field", "Value"],
		["Report Date", formatDateForFile(report.periodStart, report.timezone)],
		["Timezone", report.timezone],
		["Period Start", formatDateTime(report.periodStart, report.timezone)],
		["Period End", formatDateTime(report.periodEnd, report.timezone)],
		["Total Payments Received", formatMoney(report.totalPaymentsReceived)],
		["Total Refunds", formatMoney(report.totalRefunds)],
		["Net Received", formatMoney(report.netReceived)],
		["Payment Count", report.paymentCount],
		["Generated At", formatDateTime(report.generatedAt, report.timezone)],
	];

	const byMethod = [
		["Payment Method", "Count", "Gross Received", "Refunds", "Net Received"],
		...report.methodTotals.map((row) => [
			row.paymentMethod,
			row.count,
			formatMoney(row.grossReceived),
			formatMoney(row.refunds),
			formatMoney(row.netReceived),
		]),
		[
			"Total",
			report.paymentCount,
			formatMoney(report.totalPaymentsReceived),
			formatMoney(report.totalRefunds),
			formatMoney(report.netReceived),
		],
	];

	const payments = [
		[
			"Received At",
			"Order No",
			"Customer",
			"Payment Method",
			"Amount",
			"Reference",
			"Recorded By",
			"Status",
			"Notes",
		],
		...report.payments.map((row) => [
			formatDateTime(row.receivedAt, report.timezone),
			row.orderNo,
			row.customer,
			row.paymentMethod,
			formatMoney(row.amount),
			row.reference || "",
			row.recordedBy,
			row.status,
			row.notes || "",
		]),
	];

	const exceptions = [
		[
			"Issue",
			"Order No",
			"Customer",
			"Amount",
			"Current Value",
			"Needed Action",
		],
		...report.exceptions.map((row) => [
			row.issue,
			row.orderNo,
			row.customer,
			formatMoney(row.amount),
			row.currentValue || "",
			row.neededAction,
		]),
	];

	return xlsx.build([
		{ name: "Summary", data: summary, options: {} },
		{ name: "By Method", data: byMethod, options: {} },
		{ name: "Payments", data: payments, options: {} },
		{ name: "Exceptions", data: exceptions, options: {} },
	]);
}

async function storeWorkbook(input: {
	buffer: Buffer;
	filename: string;
	report: DailyPaymentsReport;
	runType: RunType;
}) {
	const folder = buildOwnerDocumentFolder({
		ownerType: "task-event",
		ownerId: EVENT_NAME,
		kind: "sales_daily_payment_report",
	});
	const documentService = createDocumentService(
		createVercelBlobProvider({
			put,
			token: process.env.NEXT_PUBLIC_BLOB_READ_WRITE_TOKEN,
			access: "public",
			addRandomSuffix: false,
		}),
	);
	const uploaded = await documentService.upload({
		filename: input.filename,
		folder,
		body: input.buffer,
		contentType: EXCEL_MIME,
	});

	const registry = createDocumentRegistry(createStoredDocumentRepository());
	const storedDocument = await registry.registerUploaded({
		ownerType: "task-event",
		ownerId: EVENT_NAME,
		ownerKey: formatDateForFile(
			input.report.periodStart,
			input.report.timezone,
		),
		kind: "sales_daily_payment_report",
		upload: uploaded,
		visibility: "public",
		generated: true,
		sourceType: EVENT_NAME,
		sourceId: input.runType,
		title: input.filename,
		description: "Daily payments received Excel report.",
		meta: {
			runType: input.runType,
			timezone: input.report.timezone,
			periodStart: input.report.periodStart.toISOString(),
			periodEnd: input.report.periodEnd.toISOString(),
			totalPaymentsReceived: input.report.totalPaymentsReceived,
			totalRefunds: input.report.totalRefunds,
			netReceived: input.report.netReceived,
			paymentCount: input.report.paymentCount,
		},
	});

	return {
		documentId: storedDocument.id,
		filename: input.filename,
		pathname: storedDocument.pathname,
		url: storedDocument.url,
		contentType: EXCEL_MIME,
		size: storedDocument.size,
	} satisfies StoredReportArtifact;
}

async function sendReportEmail(input: {
	report: DailyPaymentsReport;
	buffer: Buffer;
	filename: string;
	artifact: StoredReportArtifact;
	recipients: string[];
	runType: RunType;
}) {
	if (!input.recipients.length) return { sent: 0, failed: 0 };

	const resendApiKey = process.env.RESEND_API_KEY;
	if (!resendApiKey) {
		throw new Error("RESEND_API_KEY is not configured");
	}
	const client = new Resend(resendApiKey);
	const reportDate = formatDateForFile(
		input.report.periodStart,
		input.report.timezone,
	);
	const subjectPrefix = input.runType === "test" ? "TEST - " : "";
	const subject = `${subjectPrefix}Sales Daily Payment Report - ${reportDate}`;
	const html = `
		<div style="font-family: Arial, sans-serif; line-height: 1.5;">
			<h2 style="margin: 0 0 12px;">Sales Daily Payment Report</h2>
			<p>Report date: <strong>${reportDate}</strong></p>
			<table cellpadding="6" cellspacing="0" style="border-collapse: collapse;">
				<tr><td>Total payments received</td><td><strong>$${input.report.totalPaymentsReceived.toFixed(2)}</strong></td></tr>
				<tr><td>Total refunds</td><td><strong>$${input.report.totalRefunds.toFixed(2)}</strong></td></tr>
				<tr><td>Net received</td><td><strong>$${input.report.netReceived.toFixed(2)}</strong></td></tr>
				<tr><td>Payment count</td><td><strong>${input.report.paymentCount}</strong></td></tr>
			</table>
			<p>The Excel report is attached.</p>
			${input.artifact.url ? `<p><a href="${input.artifact.url}">Download report</a></p>` : ""}
		</div>
	`;

	let sent = 0;
	let failed = 0;
	for (const recipient of input.recipients) {
		const response = await client.emails.send({
			from: "GND Millwork <noreply@gndprodesk.com>",
			to: getRecipient(recipient),
			subject,
			html,
			headers: {
				"X-Entity-Ref-ID": nanoid(),
			},
			attachments: [
				{
					filename: input.filename,
					content: input.buffer.toString("base64"),
					contentType: EXCEL_MIME,
				},
			],
		});
		if (response.error) {
			failed += 1;
			logger.error("Daily payments report email failed", {
				recipient,
				error: response.error,
			});
		} else {
			sent += 1;
		}
	}

	return { sent, failed };
}

async function writeScheduleHistory(input: {
	eventName: string;
	value: number;
	meta: Record<string, unknown>;
}) {
	try {
		await db.scheduleHistory.create({
			data: {
				eventName: input.eventName,
				value: input.value,
				meta: input.meta,
			},
		});
	} catch (error) {
		logger.error("Failed writing schedule history", {
			error,
			eventName: input.eventName,
		});
	}
}

async function runDailyPaymentsReport(runType: RunType) {
	const defaultConfig = getTaskEventDefaultConfig(EVENT_NAME);
	const settings = await getSettingAction("task-events-settings", db);
	const config = (() => {
		try {
			return getTaskEventConfigFromMeta(EVENT_NAME, settings?.meta || {});
		} catch (error) {
			logger.error("Invalid task event config, using defaults", {
				error,
				eventName: EVENT_NAME,
			});
			return defaultConfig;
		}
	})();

	const filter = config.filter as DailyPaymentsReportFilter;
	if (config.status === "inactive" && runType === "scheduled") {
		await writeScheduleHistory({
			eventName: EVENT_NAME,
			value: 0,
			meta: {
				triggerType: runType,
				statusUsed: config.status,
				filterUsed: filter,
				skipped: true,
				reason: "inactive",
			},
		});
		return { skipped: true, reason: "inactive" };
	}

	const period = resolveReportPeriod({
		now: new Date(),
		timezone: filter.timezone,
		reportWindow: filter.reportWindow,
	});
	const report = await buildDailyPaymentsReport(db, {
		from: period.from,
		to: period.to,
		timezone: filter.timezone,
	});
	const filename = `sales-daily-payment-report-${period.reportDate}${runType === "test" ? "-test" : ""}.xlsx`;
	const workbookBuffer = buildWorkbook(report);
	const artifact = await storeWorkbook({
		buffer: workbookBuffer,
		filename,
		report,
		runType,
	});
	const subscribers = await getSubscribersForNotificationType(
		db,
		filter.notificationChannelName,
	);
	const recipients = subscribers
		.filter((subscriber) => subscriber.emailNotification && subscriber.email)
		.map((subscriber) => subscriber.email as string);
	const emailResult = await sendReportEmail({
		report,
		buffer: workbookBuffer,
		filename,
		artifact,
		recipients,
		runType,
	});

	await writeScheduleHistory({
		eventName: EVENT_NAME,
		value: report.netReceived,
		meta: {
			triggerType: runType,
			statusUsed: config.status,
			filterUsed: filter,
			reportDate: period.reportDate,
			periodStart: report.periodStart.toISOString(),
			periodEnd: report.periodEnd.toISOString(),
			totalPaymentsReceived: report.totalPaymentsReceived,
			totalRefunds: report.totalRefunds,
			netReceived: report.netReceived,
			paymentCount: report.paymentCount,
			exceptionCount: report.exceptions.length,
			recipientCount: recipients.length,
			sent: emailResult.sent,
			failed: emailResult.failed,
			skipped: Math.max(
				0,
				recipients.length - emailResult.sent - emailResult.failed,
			),
			notificationChannelName: filter.notificationChannelName,
			artifact,
			methodTotals: report.methodTotals,
		},
	});

	logger.info("Daily payments report completed", {
		runType,
		reportDate: period.reportDate,
		netReceived: report.netReceived,
		paymentCount: report.paymentCount,
		recipientCount: recipients.length,
	});

	return {
		reportDate: period.reportDate,
		netReceived: report.netReceived,
		paymentCount: report.paymentCount,
		recipientCount: recipients.length,
		artifact,
		...emailResult,
	};
}

export const dailyPaymentsReportSchedule = schedules.task({
	id: EVENT_NAME,
	cron: {
		pattern: "59 23 * * *",
		timezone: "America/New_York",
	},
	maxDuration: 300,
	queue: {
		concurrencyLimit: 1,
	},
	run: async () => {
		return runDailyPaymentsReport("scheduled");
	},
});

export const runDailyPaymentsReportNow = task({
	id: "run-sales-daily-payment-report-now" as TaskName,
	run: async () => {
		return runDailyPaymentsReport("now");
	},
});

export const runDailyPaymentsReportTest = task({
	id: "run-sales-daily-payment-report-test" as TaskName,
	run: async () => {
		return runDailyPaymentsReport("test");
	},
});
