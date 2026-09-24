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
					reliable. The current mobile release also uses Logly for app-use
					analytics and Sentry for crash and performance diagnostics. The
					applicable legal bases and any consent-withdrawal process are still
					under legal review; this draft does not make a final legal-basis
					claim.
				</p>
			</section>
			<section className="space-y-4">
				<h2>Who may receive information</h2>
				<p>
					Information may be available to authorized GND personnel, the
					developer when supporting GND&apos;s systems, and service providers
					involved in hosting, storage, analytics, diagnostics, and delivery of
					the service. Known providers include Vercel, Logly, and Sentry. The
					final provider list, processing locations, contract terms, and
					retention settings are being verified against the production release.
					Information may also be disclosed when required by applicable law.
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
					path. Account, work, document, security, and diagnostic records are
					kept for operational or legal needs; exact periods and provider
					backup/deletion behavior have not yet been approved. Removing a record
					from the app can restrict access before every provider copy or backup
					expires. GND is reviewing these procedures before issuing a final
					retention statement.
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
