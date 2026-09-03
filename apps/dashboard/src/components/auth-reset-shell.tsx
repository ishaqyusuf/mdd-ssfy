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
		<main className="min-h-svh bg-muted/40 text-foreground">
			<div className="mx-auto flex min-h-svh max-w-[1440px] items-center lg:px-6">
				<div className="grid min-h-svh w-full overflow-hidden border-border bg-card lg:min-h-[800px] lg:grid-cols-[1.08fr_0.92fr] lg:rounded-xl lg:border lg:shadow-2xl">
					<section className="relative min-h-[152px] overflow-hidden text-primary-foreground lg:min-h-full">
						<Image
							src="/gnd-backdrop.jpeg"
							alt="GND millwork workspace"
							fill
							priority
							className="object-cover"
						/>
						<div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(7,12,20,0.08)_0%,rgba(7,12,20,0.28)_48%,rgba(7,12,20,0.78)_100%)]" />

						<div className="relative z-10 flex h-full flex-col justify-between p-4 sm:p-6 lg:p-10">
							<Link
								href="/login"
								className="inline-flex w-fit items-center rounded-lg bg-background/95 px-3 py-2 text-foreground shadow-sm backdrop-blur"
							>
								<Icons.LogoLg />
								<span className="sr-only">
									Back to GND login
								</span>
							</Link>

							<div className="hidden max-w-lg lg:block">
								<p className="text-xs font-medium uppercase tracking-[0.2em] text-primary-foreground/70">
									GND Account Security
								</p>
								<h1 className="mt-4 text-5xl font-semibold tracking-[-0.055em] text-primary-foreground">
									Get back into your workspace with a secure
									reset link.
								</h1>
								<p className="mt-4 max-w-md text-base leading-7 text-primary-foreground/80">
									Password reset links are single-use and
									expire after one hour.
								</p>
							</div>
						</div>
					</section>

					<section className="flex items-start bg-card px-6 py-10 sm:px-10 lg:items-center lg:px-16 lg:py-14">
						<div className="mx-auto w-full max-w-[430px]">
							<div className="mb-8 flex flex-col gap-3">
								<div className="flex size-11 items-center justify-center rounded-lg bg-primary text-primary-foreground">
									{icon}
								</div>
								<p className="text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground">
									{eyebrow}
								</p>
								<div className="flex flex-col gap-2">
									<h2 className="text-3xl font-semibold tracking-[-0.045em] text-foreground">
										{title}
									</h2>
									<p className="text-sm leading-6 text-muted-foreground">
										{description}
									</p>
								</div>
							</div>

							{children}
						</div>
					</section>
				</div>
			</div>
		</main>
	);
}
