import Link from "next/link";
import type { ReactNode } from "react";

const pages = [
	{ href: "/privacy-policy", label: "Privacy Policy" },
	{ href: "/terms-of-use", label: "Terms of Use" },
	{ href: "/support", label: "Support" },
];

export function LegalDraftLayout({
	title,
	description,
	currentPath,
	children,
}: {
	title: string;
	description: string;
	currentPath: string;
	children: ReactNode;
}) {
	return (
		<main className="min-h-screen bg-[#f7f6f2] text-[#192b32]">
			<div className="border-b border-[#d9dedb] bg-[#e9eee8] px-5 py-3 text-center text-sm font-medium text-[#294b40]">
				AI-assisted draft · Pending review and approval by GND MILLWORK CORP ·
				Not the final policy or terms
			</div>
			<div className="mx-auto max-w-6xl px-5 pb-20 pt-8 sm:px-8">
				<header className="flex flex-wrap items-center justify-between gap-6 border-b border-[#d9dedb] pb-7">
					<Link
						href="/login"
						className="text-xl font-semibold tracking-tight focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#294b40]"
					>
						GND <span className="font-normal text-[#567067]">/ ProDesk</span>
					</Link>
					<nav
						aria-label="Public information"
						className="flex flex-wrap gap-x-6 gap-y-2 text-sm"
					>
						{pages.map((page) => (
							<Link
								key={page.href}
								href={page.href}
								aria-current={currentPath === page.href ? "page" : undefined}
								className="underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#294b40] aria-[current=page]:font-semibold aria-[current=page]:underline"
							>
								{page.label}
							</Link>
						))}
					</nav>
				</header>

				<div className="grid gap-12 pt-12 lg:grid-cols-[15rem_minmax(0,1fr)] lg:gap-16">
					<aside className="text-sm text-[#51615a]">
						<p className="mb-3 text-xs font-semibold uppercase tracking-[0.18em] text-[#456a56]">
							GND Millwork ProDesk
						</p>
						<p>
							A publicly downloadable app for authorized GND company accounts.
						</p>
						<div className="mt-8 border-l-2 border-[#9bb09e] pl-4">
							<p className="font-semibold text-[#192b32]">Review copy</p>
							<p className="mt-2">
								This page is public for stakeholder review. It is not yet the
								approved App Store policy or a binding set of terms.
							</p>
						</div>
					</aside>
					<article className="min-w-0 max-w-3xl">
						<p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#456a56]">
							Public review draft · 24 September 2026
						</p>
						<h1 className="mt-4 font-serif text-4xl leading-tight tracking-tight sm:text-5xl">
							{title}
						</h1>
						<p className="mt-5 max-w-2xl text-lg leading-8 text-[#51615a]">
							{description}
						</p>
						<div className="mt-10 space-y-9 border-t border-[#d9dedb] pt-10 leading-7 text-[#273b3b] [&_h2]:font-serif [&_h2]:text-2xl [&_h2]:leading-tight [&_h2]:text-[#192b32] [&_h3]:font-semibold [&_h3]:text-[#192b32] [&_li]:pl-1 [&_ul]:list-disc [&_ul]:space-y-1 [&_ul]:pl-6 [&_a]:underline [&_a]:underline-offset-4">
							{children}
						</div>
					</article>
				</div>
				<footer className="mt-20 flex flex-wrap justify-between gap-3 border-t border-[#d9dedb] pt-6 text-sm text-[#51615a]">
					<p>© GND MILLWORK CORP · Review draft</p>
					<a
						className="underline underline-offset-4"
						href="mailto:support@gndmillwork.com"
					>
						support@gndmillwork.com
					</a>
				</footer>
			</div>
		</main>
	);
}
