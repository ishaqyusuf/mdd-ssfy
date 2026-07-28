import Link from "next/link";
import Image from "next/image";
import type { ReactNode } from "react";
import { Icons } from "@gnd/ui/icons";

type AuthResetShellProps = {
	children: ReactNode;
	description: string;
	eyebrow: string;
	icon: ReactNode;
	title: string;
};

export function AuthResetShell({
	children,
	description,
	eyebrow,
	icon,
	title,
}: AuthResetShellProps) {
	return (
		<main className="min-h-screen bg-[linear-gradient(180deg,#eef2f7_0%,#f7f9fc_100%)] text-slate-950">
			<div className="mx-auto flex min-h-screen max-w-7xl items-center px-4 py-6 sm:px-6 lg:px-8">
				<div className="grid w-full overflow-hidden rounded-[36px] border border-slate-200 bg-white shadow-[0_24px_80px_rgba(15,23,42,0.08)] lg:min-h-[720px] lg:grid-cols-[1.05fr_0.95fr]">
					<section className="relative hidden min-h-[340px] overflow-hidden lg:block lg:min-h-full">
						<Image
							src="/gnd-backdrop.jpeg"
							alt="GND millwork workspace"
							fill
							priority
							className="object-cover"
						/>
						<div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(7,12,20,0.16)_0%,rgba(7,12,20,0.42)_48%,rgba(7,12,20,0.74)_100%)]" />

						<div className="relative z-10 flex h-full flex-col justify-between p-6 text-white sm:p-8 lg:p-10">
							<Link
								href="/login"
								className="inline-flex w-fit items-center rounded-2xl bg-white/92 px-4 py-3 shadow-sm backdrop-blur"
							>
								<Icons.logoLg width={110} />
								<span className="sr-only">Back to GND login</span>
							</Link>

							<div className="max-w-lg space-y-4">
								<p className="text-xs font-medium uppercase tracking-[0.2em] text-white/72">
									GND Account Security
								</p>
								<h1 className="text-4xl font-semibold text-white sm:text-5xl">
									Get back into your workspace with a secure reset link.
								</h1>
								<p className="max-w-md text-sm leading-7 text-white/78 sm:text-base">
									Password reset links are single-use and expire after one hour.
								</p>
							</div>
						</div>
					</section>

					<section className="flex items-center bg-white p-6 sm:p-8 lg:p-10">
						<div className="mx-auto w-full max-w-md">
							<Link
								href="/login"
								className="mb-6 inline-flex items-center rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm lg:hidden"
							>
								<Icons.logoLg width={110} />
								<span className="sr-only">Back to GND login</span>
							</Link>

							<div className="rounded-[32px] border border-slate-200 bg-white p-6 shadow-[0_20px_60px_rgba(15,23,42,0.08)] sm:p-8">
								<div className="mb-8 space-y-3">
									<div className="flex size-12 items-center justify-center rounded-2xl bg-slate-950 text-white">
										{icon}
									</div>
									<p className="text-xs font-medium uppercase tracking-[0.16em] text-slate-500">
										{eyebrow}
									</p>
									<div className="space-y-2">
										<h2 className="text-2xl font-semibold text-slate-950">
											{title}
										</h2>
										<p className="text-sm leading-6 text-slate-600">
											{description}
										</p>
									</div>
								</div>

								{children}
							</div>
						</div>
					</section>
				</div>
			</div>
		</main>
	);
}
