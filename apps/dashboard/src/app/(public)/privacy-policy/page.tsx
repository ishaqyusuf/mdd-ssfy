import { LegalDraftLayout } from "@/components/legal/legal-draft-layout";
import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
	title: "Privacy Policy (Review Draft) | GND ProDesk",
	description:
		"AI-assisted privacy notice draft for GND Millwork ProDesk, pending company approval.",
	robots: { index: false, follow: false },
};

export default function PrivacyPolicyPage() {
	return (
		<LegalDraftLayout
			title="Privacy Policy"
			description="How GND Millwork ProDesk handles information used in company work. This AI-assisted draft is published for GND review and is not yet an approved privacy notice."
			currentPath="/privacy-policy"
		>
			<section className="space-y-4">
				<h2>Who this notice is for</h2>
				<p>
					GND MILLWORK CORP determines how company and employee information is
					used in ProDesk. ZEROES AND ONE TECH HUB NIG LIMITED develops and
					maintains the app and related systems for GND and is the Apple App
					Store seller. The parties are reviewing the final wording of their
					data-processing roles and access arrangements.
				</p>
				<p>
					The app may be downloaded publicly, but company data and work areas
					require an active GND-issued account and the relevant permissions.
					Downloading the app does not create an account or grant access.
				</p>
			</section>
			<section className="space-y-4">
				<h2>Information the app handles</h2>
				<ul>
					<li>
						Account and work-profile details, including name, business contact
						information, role, organization, and access permissions.
					</li>
					<li>
						Sign-in, session, and security records needed to authenticate users
						and protect company systems.
					</li>
					<li>
						Job, sales, production, dispatch, and other work records that an
						account is permitted to access or update.
					</li>
					<li>
						Employee documents and document details that an authorized user
						uploads or manages.
					</li>
					<li>
						Selected photos, signatures, names, notes, and related identifiers
						when a user completes a delivery or dispatch task.
					</li>
					<li>
						App-use events and technical diagnostics, including app version,
						device platform, crash details, and performance information.
					</li>
					<li>
						Messages and details provided to support or privacy-request
						channels.
					</li>
				</ul>
				<p>
					The app uses selected photos for document and proof workflows; it does
					not require unrestricted access to a user&apos;s photo library for the
					documented first-release flow.
				</p>
			</section>
			<section className="space-y-4">
				<h2>Why information is used</h2>
				<p>
					GND uses this information to verify identity, enforce access
					permissions, run authorized company workflows, maintain business
					records, respond to requests, investigate misuse, and keep the service
					reliable. GND has chosen to disable optional Logly app-use analytics
					and Sentry crash and performance diagnostics for the first public iOS
					release; the final build still needs verification. The applicable
					legal bases and any consent-withdrawal process are still under legal
					review; this draft does not make a final legal-basis claim.
				</p>
			</section>
			<section className="space-y-4">
				<h2>Who may receive information</h2>
				<p>
					Authorized GND personnel may access information for company work.
					ZEROES AND ONE TECH HUB NIG LIMITED develops and maintains ProDesk for
					GND under arrangements still being documented.
				</p>
				<p>
					GND uses service providers to operate ProDesk. Vercel hosts
					application functions and file storage, and PlanetScale is the
					configured Production database provider.
				</p>
				<p>
					GND has selected an iOS-only Production build configuration that
					disables Logly app-use analytics and Sentry diagnostics for the first
					public iOS release. The release guard blocks a build with either
					enabled. The exact signed app has not yet been built or verified;
					Android and other releases may use different settings.
				</p>
				<p>
					When enabled, Logly receives a persistent random installation
					identifier, app version/build, platform, and limited usage events
					through GND&apos;s API.
				</p>
				<p>
					The app&apos;s analytics schema excludes names, email addresses,
					document contents, and raw work-record identifiers.
				</p>
				<p>
					When enabled, Sentry can receive error, device, app-version, and
					performance context. Disabling default PII collection does not ensure
					every diagnostic event is non-personal.
				</p>
				<p>
					GND is verifying each recipient&apos;s operator, processing terms,
					access and security controls, location, retention/deletion, and
					subprocessors against the actual release configuration.
				</p>
				<p>
					Until that review is complete, GND does not claim every provider is
					contractually bound to the same or equivalent protection stated in
					this notice. Information may also be disclosed when required by law.
				</p>
				<p>
					This draft does not assert that every historical document has already
					moved into the new private-storage workflow. GND is separately
					verifying legacy document storage and migration before finalizing the
					notice.
				</p>
			</section>
			<section className="space-y-4">
				<h2>Storage, retention, and security</h2>
				<p>
					Access to the app is controlled by company accounts and permissions.
					New employee-document uploads use an authenticated private-storage
					path.
				</p>
				<p>
					GND keeps account, work, document, security, and diagnostic records
					while access is active and while a documented operational, accounting,
					dispute, security, or legal need exists.
				</p>
				<p>
					After a verified request, GND assesses whether an eligible record can
					be deleted or anonymized. A scoped hold may delay that action.
				</p>
				<p>
					Removing a record from the app may restrict access before provider
					copies or backups expire. Their exact expiry periods and the
					legacy-document migration remain under verification.
				</p>
			</section>
			<section className="space-y-4">
				<h2>Your choices and requests</h2>
				<p>
					For access, correction, deletion, or another applicable privacy
					request, email{" "}
					<a href="mailto:support@gndmillwork.com">support@gndmillwork.com</a>.
					GND may need to verify your identity and authority, and some work
					records may need to be retained for a legitimate obligation. Company
					administrators manage account access and offboarding; the app does not
					offer public self-registration. See{" "}
					<Link href="/support">Support and privacy requests</Link> for the
					contact route.
				</p>
			</section>
			<section className="space-y-4">
				<h2>International processing and changes</h2>
				<p>
					Some providers process information outside the user&apos;s country.
					The specific locations and any applicable transfer safeguards are
					under review. ProDesk is a business application and is not directed to
					children. Once approved, this page will identify its effective date
					and be updated when material practices change.
				</p>
			</section>
			<section className="rounded-xl border border-[#c6d4c8] bg-[#edf2eb] p-5 space-y-3">
				<h2>Pending approval</h2>
				<p>
					GND must verify the developer/service-provider relationship, provider
					and regional details, legacy document migration, retention and
					deletion rules, applicable legal bases, and final app behavior before
					removing the draft label or using this URL in App Store Connect.
				</p>
			</section>
		</LegalDraftLayout>
	);
}
