import { LegalDraftLayout } from "@/components/legal/legal-draft-layout";
import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
	title: "Terms of Use (Review Draft) | GND ProDesk",
	description:
		"AI-assisted terms of use draft for GND Millwork ProDesk, pending company approval.",
	robots: { index: false, follow: false },
};

export default function TermsOfUsePage() {
	return (
		<LegalDraftLayout
			title="Terms of Use"
			description="Proposed rules for using GND Millwork ProDesk. These AI-assisted terms are public for review only; they are not yet approved or in force."
			currentPath="/terms-of-use"
		>
			<section className="space-y-4">
				<h2>About ProDesk</h2>
				<p>
					GND MILLWORK CORP operates ProDesk for authorized company work. ZEROES
					AND ONE TECH HUB NIG LIMITED develops and maintains the software for
					GND and is listed as its Apple App Store seller. App Store
					availability does not mean the service is open for public account
					registration.
				</p>
			</section>
			<section className="space-y-4">
				<h2>Accounts and access</h2>
				<p>
					Only people given an active GND account may sign in. Access to
					particular records and actions depends on assigned roles and
					permissions. Users should keep credentials private, use only their own
					account, and tell GND promptly if they suspect unauthorized access.
					GND may change or end access when a role changes, employment ends, or
					access is no longer authorized.
				</p>
			</section>
			<section className="space-y-4">
				<h2>Appropriate use</h2>
				<p>
					Use ProDesk only for authorized GND business. Do not access records
					outside your role, share company or employee information without
					authority, misrepresent a work event, interfere with service security,
					or upload unlawful or unrelated content. Follow GND&apos;s applicable
					workplace, record-handling, and security instructions.
				</p>
			</section>
			<section className="space-y-4">
				<h2>Records and uploads</h2>
				<p>
					Users remain responsible for the accuracy and appropriateness of
					information they submit, including employee documents, delivery
					evidence, photos, signatures, and notes. These records may be visible
					to other authorized personnel and may be retained as part of
					GND&apos;s business or legal records. Personal-information handling is
					described in the{" "}
					<Link href="/privacy-policy">Privacy Policy review draft</Link>.
				</p>
			</section>
			<section className="space-y-4">
				<h2>Service changes and support</h2>
				<p>
					GND may maintain, update, restrict, or suspend parts of the service to
					operate and protect its systems. Users should report access or
					technical problems through <Link href="/support">Support</Link>. An
					app download or a previously issued account does not guarantee
					continued access to a particular feature or company record.
				</p>
			</section>
			<section className="space-y-4">
				<h2>App stores and other services</h2>
				<p>
					The app may be obtained through a third-party app store. Store terms
					and device-provider terms may also apply. ProDesk may depend on
					hosting, storage, and diagnostic providers; their involvement is
					described in the privacy draft and will be verified before final
					publication.
				</p>
			</section>
			<section className="rounded-xl border border-[#c6d4c8] bg-[#edf2eb] p-5 space-y-3">
				<h2>Pending legal review</h2>
				<p>
					This page is informational guidance, not a separate contract. GND
					employment policies and instructions continue to apply.
				</p>
				<p>
					The requested effective date for this guidance is September 24, 2026,
					pending final publication. No checkbox or app action is treated as
					acceptance of this draft.
				</p>
			</section>
		</LegalDraftLayout>
	);
}
