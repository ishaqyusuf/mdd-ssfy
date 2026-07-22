#!/usr/bin/env bun

import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync } from "node:fs";
import { homedir } from "node:os";
import { join, resolve } from "node:path";
import { db } from "../packages/db/src/index";
import { sendDirectDealerProgramInvitation } from "../packages/db/src/queries/dealer-program";

const dealershipUrl = (
	process.env.DEALERSHIP_QA_URL || "http://localhost:3016"
).replace(/\/$/, "");
const officeUrl = (
	process.env.OFFICE_QA_URL || "http://localhost:3010"
).replace(/\/$/, "");
const outputDir = resolve(
	process.env.DEALERSHIP_RECRUITMENT_QA_OUTPUT_DIR ||
		"/private/tmp/gnd-dealership-recruitment-qa",
);
const browseBinary =
	process.env.GSTACK_BROWSE_BIN ||
	join(homedir(), ".codex/skills/gstack/browse/dist/browse");
const password =
	process.env.DEALERSHIP_RECRUITMENT_QA_PASSWORD || "CodexQA!2026";

if (!existsSync(browseBinary)) {
	throw new Error(
		`Browser QA binary not found at ${browseBinary}. Set GSTACK_BROWSE_BIN to the gstack browse executable.`,
	);
}

mkdirSync(outputDir, { recursive: true });
const screenshot = (name: string) => join(outputDir, name);
const awaitBodyText = (value: string) =>
	`(async () => { const expected = ${JSON.stringify(value)}; while (!document.body?.innerText.includes(expected)) await new Promise((resolve) => setTimeout(resolve, 100)); return expected; })()`;

function runPhase(label: string, commands: string[][]) {
	console.log(`\n== ${label} ==`);
	const result = spawnSync(browseBinary, ["chain"], {
		input: JSON.stringify(commands),
		encoding: "utf8",
		timeout: 45_000,
		env: process.env,
	});
	process.stdout.write(result.stdout || "");
	process.stderr.write(result.stderr || "");
	if (result.error) throw result.error;
	const output = `${result.stdout || ""}\n${result.stderr || ""}`;
	if (result.status !== 0 || output.includes("ERROR:")) {
		throw new Error(`${label} failed with exit code ${result.status || 1}.`);
	}
}

async function poll<T>(
	label: string,
	read: () => Promise<T | null | undefined | false>,
	timeoutMs = 30_000,
) {
	const startedAt = Date.now();
	while (Date.now() - startedAt < timeoutMs) {
		const value = await read();
		if (value) return value;
		await Bun.sleep(250);
	}
	throw new Error(`Timed out waiting for ${label}.`);
}

async function warm(url: string) {
	const response = await fetch(url, { redirect: "follow" });
	await response.text();
	if (!response.ok) {
		throw new Error(`Could not warm ${url}: HTTP ${response.status}.`);
	}
}

async function waitForBrowserPathChange(pathname: string, timeoutMs = 60_000) {
	const startedAt = Date.now();
	while (Date.now() - startedAt < timeoutMs) {
		const result = spawnSync(browseBinary, ["js", "location.pathname"], {
			encoding: "utf8",
			timeout: 15_000,
			env: process.env,
		});
		const output = `${result.stdout || ""}\n${result.stderr || ""}`;
		if (
			result.status === 0 &&
			output.includes("[js]") &&
			!output.includes(pathname)
		) {
			return;
		}
		await Bun.sleep(250);
	}
	throw new Error(`Timed out waiting for the browser to leave ${pathname}.`);
}

const suffix = `${Date.now()}`;
const companyName = `Codex Dealer QA ${suffix}`;
const applicantName = `Codex Applicant ${suffix}`;
const applicantEmail = `codex.dealer.qa.${suffix}@example.com`;
const applicantPhone = `555${suffix.slice(-7)}`;
const ownedCustomerName = `Codex Direct Ship Customer ${suffix}`;
const orderId = `QA-${suffix.slice(-10)}`;
const logoUrl = `data:image/svg+xml;base64,${Buffer.from(
	'<svg xmlns="http://www.w3.org/2000/svg" width="240" height="72"><rect width="240" height="72" rx="10" fill="#0f766e"/><text x="120" y="45" text-anchor="middle" font-family="Arial" font-size="26" font-weight="700" fill="white">CODEX DEALER</text></svg>',
).toString("base64")}`;

console.log(
	`Running dealership recruitment browser QA against ${dealershipUrl}`,
);
console.log(`Office app: ${officeUrl}`);
console.log(`Artifacts: ${outputDir}`);

try {
	const actor = await db.users.findFirst({
		where: { name: "Pablo Cruz", deletedAt: null },
		select: { id: true },
	});
	if (!actor) throw new Error("Pablo Cruz office QA actor was not found.");
	const staleApplicants = await db.customers.findMany({
		where: { businessName: { startsWith: "Codex Dealer QA " } },
		select: { id: true },
	});
	const staleApplicantIds = staleApplicants.map((row) => row.id);
	if (staleApplicantIds.length) {
		const staleDealers = await db.dealerAuth.findMany({
			where: { dealerId: { in: staleApplicantIds } },
			select: { id: true },
		});
		const staleDealerIds = staleDealers.map((row) => row.id);
		const now = new Date();
		await db.$transaction([
			db.dealerProgramApplication.updateMany({
				where: { customerId: { in: staleApplicantIds }, deletedAt: null },
				data: { deletedAt: now },
			}),
			db.dealerRecruitmentInvitation.updateMany({
				where: { customerId: { in: staleApplicantIds }, deletedAt: null },
				data: { deletedAt: now },
			}),
			db.dealerAuth.updateMany({
				where: { id: { in: staleDealerIds }, deletedAt: null },
				data: { deletedAt: now },
			}),
			db.customers.updateMany({
				where: {
					OR: [
						{ id: { in: staleApplicantIds } },
						{ dealerOwnerId: { in: staleDealerIds } },
					],
					deletedAt: null,
				},
				data: { deletedAt: now },
			}),
			db.customerTypes.updateMany({
				where: { dealerOwnerId: { in: staleDealerIds }, deletedAt: null },
				data: { deletedAt: now },
			}),
			db.salesOrders.updateMany({
				where: { dealerAuthId: { in: staleDealerIds }, deletedAt: null },
				data: { deletedAt: now },
			}),
		]);
	}

	const campaign = await db.dealerRecruitmentCampaign.findFirst({
		where: { status: "ACTIVE", deletedAt: null },
		orderBy: { activatedAt: "desc" },
		select: { id: true, headline: true },
	});
	if (!campaign) throw new Error("An active dealership campaign is required.");

	const applicant = await db.customers.create({
		data: {
			name: applicantName,
			businessName: companyName,
			email: applicantEmail,
			phoneNo: applicantPhone,
			address: "4100 Codex Commerce Way, Miami, FL 33101",
			addressBooks: {
				create: {
					name: companyName,
					address1: "4100 Codex Commerce Way",
					city: "Miami",
					state: "FL",
					country: "US",
					email: applicantEmail,
					phoneNo: applicantPhone,
					isPrimary: true,
					meta: { zip_code: "33101" },
				},
			},
		},
		select: { id: true },
	});

	let applicationUrl = "";
	const invitation = await sendDirectDealerProgramInvitation(
		db,
		actor.id,
		{ customerId: applicant.id, baseUrl: officeUrl },
		async (delivery) => {
			applicationUrl = delivery.applicationUrl;
			return {
				status: "SENT",
				providerMessageId: `local-browser-qa-${suffix}`,
				providerStatus: "accepted-local-qa",
			};
		},
	);
	if (!applicationUrl || invitation.deliveryStatus !== "SENT") {
		throw new Error("The local dealership invitation was not prepared.");
	}
	await warm(applicationUrl);

	runPhase("open the public recruitment landing page", [
		["goto", applicationUrl],
		["wait", `text=${campaign.headline}`],
		["wait", `text=${companyName}`],
		["screenshot", "--viewport", screenshot("01-public-landing.png")],
	]);
	runPhase("submit the dealership application", [
		["click", "#dealer-program-consent"],
		["click", "text=Request partnership"],
		["wait", "text=Request received"],
		["screenshot", "--viewport", screenshot("02-application-submitted.png")],
	]);

	const pendingApplication = await poll("pending dealership application", () =>
		db.dealerProgramApplication.findFirst({
			where: { customerId: applicant.id, status: "PENDING", deletedAt: null },
			select: { id: true },
		}),
	);

	runPhase("open the office sign-in", [
		["goto", `${officeUrl}/login/v2`],
		["wait", "text=Dev Quick Login"],
	]);
	runPhase("select the office QA administrator", [
		["click", 'button:has-text("Quick Login")'],
		[
			"wait",
			'[role="menuitem"]:has-text("Pablo Cruz"):has-text("Super Admin")',
		],
	]);
	runPhase("complete the office sign-in", [
		[
			"click",
			'[role="menuitem"]:has-text("Pablo Cruz"):has-text("Super Admin")',
		],
	]);
	await Bun.sleep(2_000);
	runPhase("open the recruitment administration", [
		["goto", `${officeUrl}/sales-book/dealers`],
	]);
	runPhase("wait for the recruitment administration", [
		["js", awaitBodyText("Dealership recruitment")],
	]);
	runPhase("capture the pending dealership application", [
		["click", '[role="tab"]:has-text("Applications")'],
		["wait", `text=${companyName}`],
		["screenshot", "--viewport", screenshot("03-office-pending.png")],
	]);
	runPhase("approve the dealership application", [
		[
			"click",
			`button[aria-label="Approve dealership application for ${companyName}"]`,
		],
	]);

	const approvedApplication = await poll(
		"approved dealership application",
		() =>
			db.dealerProgramApplication.findFirst({
				where: { id: pendingApplication.id, status: "APPROVED" },
				select: { dealerAuthId: true },
			}),
	);
	if (!approvedApplication.dealerAuthId) {
		throw new Error(
			"The approved application was not linked to a dealer account.",
		);
	}
	const dealerId = approvedApplication.dealerAuthId;
	const onboarding = await db.dealerToken.findFirst({
		where: { dealerId, consumedAt: null, deletedAt: null },
		orderBy: { expiredAt: "desc" },
		select: { token: true },
	});
	if (!onboarding) throw new Error("The onboarding token was not created.");

	runPhase("reload the approved office state", [
		["reload"],
		["js", awaitBodyText("Dealership recruitment")],
	]);
	runPhase("capture the approved office state", [
		["click", '[role="tab"]:has-text("Applications")'],
		[
			"wait",
			`button[aria-label="Reset dealership application eligibility for ${companyName}"]`,
		],
		["screenshot", "--viewport", screenshot("04-office-approved.png")],
	]);
	runPhase("open dealer password onboarding", [
		["goto", `${dealershipUrl}/create-password/${onboarding.token}`],
		["wait", "text=Create password"],
	]);
	runPhase("submit dealer password onboarding", [
		["fill", "#password", password],
		["fill", "#confirmPassword", password],
		["screenshot", "--viewport", screenshot("05-password-onboarding.png")],
		["click", "text=Create password"],
	]);
	runPhase("verify dealer password onboarding", [
		["wait", "text=Welcome back"],
	]);

	await poll("consumed onboarding token", () =>
		db.dealerToken.findFirst({
			where: { dealerId, token: onboarding.token, consumedAt: { not: null } },
			select: { token: true },
		}),
	);

	const dealerAddress = await db.addressBooks.findFirst({
		where: { customerId: applicant.id, isPrimary: true, deletedAt: null },
		select: { id: true },
	});
	if (!dealerAddress) throw new Error("The dealer billing address is missing.");

	const fixtures = await db.$transaction(async (tx) => {
		const profile = await tx.customerTypes.create({
			data: {
				title: `QA Retail ${suffix}`,
				dealerOwnerId: dealerId,
				coefficient: 0.65,
				salesPercentage: 25,
				defaultProfile: true,
			},
		});
		const customer = await tx.customers.create({
			data: {
				name: ownedCustomerName,
				businessName: ownedCustomerName,
				email: `ship.${suffix}@example.com`,
				phoneNo: `556${suffix.slice(-7)}`,
				address: "825 Delivery Lane, Orlando, FL 32801",
				dealerOwnerId: dealerId,
				customerTypeId: profile.id,
				officeVisibility: "PRIVATE",
				addressBooks: {
					create: {
						name: ownedCustomerName,
						address1: "825 Delivery Lane",
						city: "Orlando",
						state: "FL",
						country: "US",
						email: `ship.${suffix}@example.com`,
						phoneNo: `556${suffix.slice(-7)}`,
						isPrimary: true,
						meta: { zip_code: "32801" },
					},
				},
			},
			include: { addressBooks: { where: { isPrimary: true }, take: 1 } },
		});
		const shippingAddressId = customer.addressBooks[0]?.id;
		if (!shippingAddressId)
			throw new Error("Direct-ship address was not created.");
		const internalProfile = await tx.customerTypes.findFirst({
			where: { dealerOwnerId: null, deletedAt: null },
			orderBy: { id: "asc" },
			select: { id: true, coefficient: true },
		});
		if (!internalProfile)
			throw new Error("An internal customer profile is required.");
		const quote = await tx.salesOrders.create({
			data: {
				orderId,
				slug: `qa-${suffix}`,
				type: "quote",
				status: "Draft",
				isDyke: true,
				dealerAuthId: dealerId,
				customerId: customer.id,
				billingAddressId: shippingAddressId,
				shippingAddressId,
				customerProfileId: internalProfile.id,
				dealerSalesProfileId: profile.id,
				deliveryOption: "delivery",
				subTotal: 200,
				grandTotal: 200,
				amountDue: 200,
				meta: {
					salesCoefficient: internalProfile.coefficient,
					newSalesForm: {
						version: suffix,
						updatedAt: new Date().toISOString(),
						autosave: false,
						lineItems: [
							{
								uid: `qa-line-${suffix}`,
								title: "Direct-shipping QA door package",
								description: "Direct-shipping QA door package",
								qty: 1,
								unitPrice: 250,
								lineTotal: 250,
							},
						],
						extraCosts: [],
						summary: {
							subTotal: 250,
							taxableSubTotal: 0,
							taxTotal: 0,
							grandTotal: 250,
						},
						form: {
							customerId: customer.id,
							customerProfileId: profile.id,
							po: `QA-${suffix.slice(-6)}`,
							paymentTerm: "None",
							deliveryOption: "delivery",
							sellerOfRecord: "DEALER",
							resaleCertificateOnFile: true,
						},
					},
				},
				items: {
					create: {
						description: "Direct-shipping QA door package",
						dykeDescription: "Direct-shipping QA door package",
						qty: 1,
						rate: 200,
						total: 200,
						meta: { uid: `qa-line-${suffix}`, tax: false },
					},
				},
				dealerSale: {
					create: {
						dealerAuthId: dealerId,
						customerId: customer.id,
						dealerCustomerProfileId: profile.id,
						sellerOfRecord: "DEALER",
						internalSubtotal: 200,
						internalTaxableSubtotal: 0,
						internalTax: 0,
						dealerSubtotal: 250,
						dealerTaxableSubtotal: 0,
						dealerCustomerTax: 0,
						dealerMarkupAmount: 50,
						dealerSalesPercentage: 25,
						resaleCertificateOnFile: true,
						grandTotal: 250,
						dueAmount: 250,
					},
				},
			},
		});
		await tx.dealerAuth.update({
			where: { id: dealerId },
			data: {
				primaryBillingAddressId: dealerAddress.id,
				primaryShippingAddressId: dealerAddress.id,
				meta: {
					logoUrl,
					defaultCustomerProfileId: profile.id,
					defaultFulfillmentMode: "delivery",
					billingZip: "33101",
					brandingVersion: Date.now(),
				},
			},
		});
		return { customerId: customer.id, quoteId: quote.id };
	});

	runPhase("open the newly approved dealer sign-in", [
		["goto", `${dealershipUrl}/login`],
		["wait", "text=Welcome back"],
	]);
	runPhase("sign in as the newly approved dealer", [
		["fill", "#email", applicantEmail],
		["fill", "#password", password],
		["click", "text=Continue to workspace"],
	]);
	runPhase("capture the newly approved dealer workspace", [
		["wait", 'button[aria-label="Open account menu"]'],
		["screenshot", "--viewport", screenshot("06-dealer-workspace.png")],
	]);
	runPhase("open the dealer-owned customer list", [
		["goto", `${dealershipUrl}/customers`],
		["wait", `text=${ownedCustomerName}`],
	]);
	runPhase("share a dealer-owned customer with the office", [
		[
			"click",
			`button[aria-label="Allow office access for ${ownedCustomerName}"]`,
		],
		[
			"wait",
			`button[aria-label="Remove office access for ${ownedCustomerName}"]`,
		],
		["screenshot", "--viewport", screenshot("07-customer-shared.png")],
	]);
	await poll("shared office visibility", () =>
		db.customers.findFirst({
			where: { id: fixtures.customerId, officeVisibility: "SHARED" },
			select: { id: true },
		}),
	);

	runPhase("open the dealer quote list", [
		["goto", `${dealershipUrl}/quotes`],
		["wait", `text=${orderId}`],
	]);
	runPhase("request a customer-priced branded print preview", [
		["click", `button[aria-label="Actions for quote ${orderId}"]`],
		["click", "text=Print customer"],
	]);
	await waitForBrowserPathChange("/quotes");
	runPhase("verify the dealer brand in the print preview", [
		["wait", `text=${companyName}`],
		[
			"screenshot",
			"--viewport",
			screenshot("08-branded-direct-shipping-print.png"),
		],
	]);

	const directShipQuote = await db.salesOrders.findFirst({
		where: {
			id: fixtures.quoteId,
			dealerAuthId: dealerId,
			deliveryOption: "delivery",
			shippingAddressId: { not: null },
		},
		select: { id: true },
	});
	if (!directShipQuote)
		throw new Error("The direct-shipping quote proof is invalid.");

	runPhase("open dealer access administration", [
		["goto", `${officeUrl}/sales-book/dealers`],
		["js", awaitBodyText("Dealership recruitment")],
		["click", '[role="tab"]:has-text("Dealer access")'],
	]);
	runPhase("suspend the dealer account", [
		["wait", `button[aria-label="Suspend dealer ${companyName}"]`],
		["click", `button[aria-label="Suspend dealer ${companyName}"]`],
	]);
	await poll("suspended dealer account", () =>
		db.dealerAuth.findFirst({
			where: { id: dealerId, restricted: true, status: "suspended" },
			select: { id: true },
		}),
	);
	runPhase("reload the suspended dealer account", [
		["reload"],
		["js", awaitBodyText("Dealership recruitment")],
		["click", '[role="tab"]:has-text("Dealer access")'],
	]);
	runPhase("capture and reactivate the dealer account", [
		["wait", `button[aria-label="Reactivate dealer ${companyName}"]`],
		["screenshot", "--viewport", screenshot("09-dealer-suspended.png")],
		["click", `button[aria-label="Reactivate dealer ${companyName}"]`],
	]);
	await poll("reactivated dealer account", () =>
		db.dealerAuth.findFirst({
			where: { id: dealerId, restricted: false, status: "active" },
			select: { id: true },
		}),
	);
	runPhase("reload the reactivated dealer state", [
		["reload"],
		["js", awaitBodyText("Dealership recruitment")],
		["click", '[role="tab"]:has-text("Dealer access")'],
	]);
	runPhase("capture the reactivated dealer state", [
		["wait", `button[aria-label="Suspend dealer ${companyName}"]`],
		["screenshot", "--viewport", screenshot("10-dealer-reactivated.png")],
	]);

	console.log("Dealership recruitment browser QA passed.");
} finally {
	await db.$disconnect();
}
