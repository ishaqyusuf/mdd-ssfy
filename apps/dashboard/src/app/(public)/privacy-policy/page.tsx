import { LegalPageLayout } from "@/components/legal/legal-page-layout";
import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
	title: "Privacy Policy | GND ProDesk",
	description:
		"How GND Millwork ProDesk handles information used in company work.",
};

export default function PrivacyPolicyPage() {
	return (
		<LegalPageLayout
			title="Privacy Policy"
			description="How GND Millwork ProDesk handles information used in company work."
			currentPath="/privacy-policy"
			lastUpdated="29 September 2026"
		>
			<section className="space-y-4">
				<h2>Who this notice is for</h2>
				<p>
					GND MILLWORK CORP determines how company and employee information is
					used in ProDesk. ZEROES AND ONE TECH HUB NIG LIMITED develops and
					maintains the app and related systems for GND and is the Apple App
					Store seller. The parties have signed an arrangement governing the
					developer&apos;s access to and processing of GND data.
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
					reliable.
				</p>
			</section>
			<section className="space-y-4">
				<h2>Who may receive information</h2>
				<p>
					Authorized GND personnel may access information for company work.
					ZEROES AND ONE TECH HUB NIG LIMITED develops and maintains ProDesk for
					GND under a signed processing arrangement.
				</p>
				<p>
					GND uses service providers to operate ProDesk. Vercel hosts
					application functions and file storage, and PlanetScale is the
					configured Production database provider.
				</p>
				<p>
					The first public iOS release is configured without optional Logly
					app-use analytics or Sentry diagnostics. Android and other releases
					may use different settings.
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
					GND requires Vercel and PlanetScale to protect personal information to
					the same or an equivalent standard as described in this notice. GND
					has confirmed that its arrangements with these providers require that
					protection.
				</p>
				<p>Information may also be disclosed when required by law.</p>
				<p>
					Some historical employee documents may remain in earlier storage
					configurations until they are migrated or removed. New
					employee-document uploads use private storage.
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
					GND retains company account, work, document, security, and diagnostic
					records for operational, accounting, dispute, security, and legal
					purposes. Offboarding can end an employee&apos;s access without
					erasing company work records.
				</p>
				<p>
					ProDesk does not offer user-requested account or data deletion.
					Company administrators manage account access and records under
					GND&apos;s retention practices and applicable requirements.
				</p>
				<p>
					Provider backup systems may retain additional copies under their
					retention practices.
				</p>
			</section>
			<section className="space-y-4">
				<h2>Your choices and requests</h2>
				<p>
					For questions about access, correction, or privacy practices, email{" "}
					<a href="mailto:support@gndmillwork.com">support@gndmillwork.com</a>.
					GND may need to verify your identity and authority. Company
					administrators create accounts by invitation and manage offboarding;
					the app does not offer public self-registration or deletion on
					request. See <Link href="/support">Support and privacy requests</Link>{" "}
					for the contact route.
				</p>
			</section>
			<section className="space-y-4">
				<h2>International processing and changes</h2>
				<p>
					Information may be processed outside the user&apos;s country. GND
					requires them to protect the information as described above. ProDesk
					is a business application and is not directed to children. GND will
					update this notice when material practices change.
				</p>
			</section>
		</LegalPageLayout>
	);
}
