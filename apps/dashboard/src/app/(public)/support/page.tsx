import { LegalPageLayout } from "@/components/legal/legal-page-layout";
import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
	title: "Support | GND ProDesk",
	description:
		"GND Millwork ProDesk support and privacy request contact information.",
};

export default function SupportPage() {
	return (
		<LegalPageLayout
			title="Support & privacy requests"
			description="A public contact path for ProDesk users."
			currentPath="/support"
		>
			<section className="space-y-4">
				<h2>Contact GND</h2>
				<p>
					For app access, technical help, feedback, or privacy requests, email{" "}
					<a href="mailto:support@gndmillwork.com">support@gndmillwork.com</a>.
					Include a short description of the issue and a way to contact you.
					Please do not email passwords, one-time codes, or sensitive documents.
				</p>
			</section>
			<section className="space-y-4">
				<h2>Privacy and account requests</h2>
				<p>
					You may ask about access to, correction of, or deletion of personal
					information at the same address. GND may verify your identity and your
					authority to make a request. Company administrators manage account
					access; requests concerning employment records may be subject to
					applicable retention obligations. The{" "}
					<Link href="/privacy-policy">Privacy Policy</Link> explains how GND
					handles these requests.
				</p>
			</section>
			<section className="space-y-4">
				<h2>When you cannot sign in</h2>
				<p>
					ProDesk does not currently provide public self-registration. If you
					are a GND team member, ask your company administrator to check your
					account and role. If you are not an authorized team member,
					downloading the app does not grant company access.
				</p>
			</section>
		</LegalPageLayout>
	);
}
