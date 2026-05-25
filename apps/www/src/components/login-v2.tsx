"use client";

import { signIn, useSession } from "@/lib/auth/client";
import Image from "next/image";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { z } from "zod";

import { Checkbox } from "@gnd/ui/checkbox";
import {
	Form,
	FormControl,
	FormField,
	FormItem,
	FormLabel,
	FormMessage,
} from "@gnd/ui/form";

import { Env } from "@/components/env";
import QuickLogin from "@/components/quick-login";
import { SubmitButton } from "@/components/submit-button";
import { sendEmailLoginLink } from "@/app-deps/(v1)/_actions/auth";
import { useZodForm } from "@/hooks/use-zod-form";
import { useTransition } from "@/utils/use-safe-transistion";
import { Icons } from "@gnd/ui/icons";
import { InputGroup } from "@gnd/ui/namespace";
import { toast } from "sonner";

const loginSchema = z.object({
	email: z.string().email({ message: "Enter a valid work email address." }),
	password: z.string().min(1, { message: "Password is required." }),
	rememberMe: z.boolean().default(false),
});

type LoginFormValues = z.infer<typeof loginSchema>;

export function LoginV2() {
	const router = useRouter();
	const searchParams = useSearchParams();
	const { data: session } = useSession();
	const [isPending, startTransition] = useTransition();
	const [isSubmitting, setIsSubmitting] = useState(false);
	const [isEmailLinkSubmitting, setIsEmailLinkSubmitting] = useState(false);

	const callbackUrl =
		getSafeCallbackUrl(searchParams.get("return_to")) ||
		getSafeCallbackUrl(searchParams.get("callbackUrl")) ||
		"/";
	const token = searchParams.get("token");

	const form = useZodForm(loginSchema, {
		defaultValues: {
			email: "",
			password: "",
			rememberMe: false,
		},
	});

	useEffect(() => {
		if (session?.user?.id) {
			router.replace(callbackUrl);
		}
	}, [callbackUrl, router, session]);

	useEffect(() => {
		const error = searchParams.get("error");
		if (!error) return;

		toast.error(getLoginErrorMessage(error));
	}, [searchParams]);

	useEffect(() => {
		if (!token) return;

		signIn("credentials", {
			token,
			callbackUrl,
			redirect: true,
		});
	}, [callbackUrl, token]);

	const onSubmit = form.handleSubmit((values: LoginFormValues) => {
		setIsSubmitting(true);
		startTransition(async () => {
			try {
				const result = await signIn("credentials", {
					email: values.email,
					password: values.password,
					rememberMe: values.rememberMe ? "true" : "false",
					callbackUrl,
					redirect: false,
				});

				if (!result.ok) {
					toast.error(result.error || "Invalid email or password.");
					setIsSubmitting(false);
					return;
				}

				window.location.assign(result.url || callbackUrl);
			} catch (error) {
				setIsSubmitting(false);
				toast.error(
					error instanceof Error
						? error.message
						: "Unable to sign in. Please try again.",
				);
			}
		});
	});

	async function onSendEmailLink() {
		const hasValidEmail = await form.trigger("email");
		if (!hasValidEmail) return;

		setIsEmailLinkSubmitting(true);
		try {
			await sendEmailLoginLink({
				email: form.getValues("email"),
				callbackUrl,
			});
			toast.success("If this account is active, a login link is on its way.");
		} catch (error) {
			toast.error(
				error instanceof Error
					? error.message
					: "Unable to send login link. Please try again.",
			);
		} finally {
			setIsEmailLinkSubmitting(false);
		}
	}

	return (
		<main className="min-h-screen bg-[linear-gradient(180deg,#eef2f7_0%,#f7f9fc_100%)] text-[#0f172a]">
			<div className="mx-auto flex min-h-screen max-w-7xl items-center px-4 py-6 sm:px-6 lg:px-8">
				<div className="grid w-full overflow-hidden rounded-[36px] border border-slate-200 bg-white shadow-[0_24px_80px_rgba(15,23,42,0.08)] lg:min-h-[720px] lg:grid-cols-[1.1fr_0.9fr]">
					<section className="relative hidden min-h-[340px] overflow-hidden lg:block lg:min-h-full">
						<Image
							src="/gnd-backdrop.jpeg"
							alt="GND millwork backdrop"
							fill
							priority
							className="object-cover"
						/>
						<div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(7,12,20,0.18)_0%,rgba(7,12,20,0.42)_45%,rgba(7,12,20,0.72)_100%)]" />
						<div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.18),transparent_30%)]" />

						<div className="relative z-10 flex h-full flex-col justify-between p-6 text-white sm:p-8 lg:p-10">
							<div className="inline-flex w-fit items-center rounded-2xl bg-white/92 px-4 py-3 shadow-sm backdrop-blur">
								<Icons.logoLg width={110} />
							</div>

							<div className="max-w-lg space-y-4">
								<p className="text-xs font-medium tracking-[0.2em] text-white/72 uppercase">
									GND Workspace
								</p>
								<h1 className="text-4xl font-semibold tracking-[-0.04em] text-white sm:text-5xl">
									Sign in and get back to work.
								</h1>
								<p className="max-w-md text-sm leading-7 text-white/78 sm:text-base">
									The backdrop now carries the mood of the page, while the form
									stays focused and easy to use.
								</p>
								<div className="inline-flex max-w-md items-center rounded-2xl border border-white/18 bg-black/20 px-4 py-3 text-sm leading-6 text-white/80 backdrop-blur-sm">
									Email and password sign-in, token login links, safe redirects,
									and password reset are all preserved.
								</div>
							</div>
						</div>
					</section>

					<section className="flex items-center bg-white p-6 sm:p-8 lg:p-10">
						<div className="mx-auto w-full max-w-md">
							<div className="mb-6 inline-flex items-center rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm lg:hidden">
								<Icons.logoLg width={110} />
							</div>
							<div className="rounded-[32px] border border-slate-200 bg-white p-6 shadow-[0_20px_60px_rgba(15,23,42,0.08)] sm:p-8">
								<div className="mb-8 space-y-2">
									<div className="flex size-12 items-center justify-center rounded-2xl bg-slate-950 text-white">
										<Icons.LockKeyhole className="size-5" />
									</div>
									<h2 className="text-2xl font-semibold tracking-[-0.03em] text-slate-950">
										Welcome back
									</h2>
									<p className="text-sm leading-6 text-slate-600">
										Use your GND credentials to continue.
									</p>
								</div>

								<Form {...form}>
									<form className="space-y-5" onSubmit={onSubmit}>
										<FormField
											control={form.control}
											name="email"
											render={({ field }) => (
												<FormItem className="space-y-2">
													<FormLabel className="text-slate-700">
														Email
													</FormLabel>
													<FormControl>
														<InputGroup className="h-12 rounded-2xl bg-slate-50">
															<InputGroup.Addon align="inline-start">
																<Icons.Mail className="text-slate-400" />
															</InputGroup.Addon>
															<InputGroup.Input
																{...field}
																type="email"
																placeholder="you@gndmillwork.com"
																autoComplete="email"
																className="text-base text-slate-950 placeholder:text-slate-400"
															/>
														</InputGroup>
													</FormControl>
													<FormMessage />
												</FormItem>
											)}
										/>

										<FormField
											control={form.control}
											name="rememberMe"
											render={({ field }) => (
												<FormItem className="flex flex-row items-start gap-3 space-y-0 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
													<FormControl>
														<Checkbox
															checked={field.value}
															onCheckedChange={(checked) =>
																field.onChange(checked === true)
															}
															aria-label="Remember me on this device"
															className="mt-0.5 border-slate-300 data-[state=checked]:border-slate-950 data-[state=checked]:bg-slate-950"
														/>
													</FormControl>
													<div className="space-y-1">
														<FormLabel className="text-sm font-medium text-slate-800">
															Remember me
														</FormLabel>
														<p className="text-xs leading-5 text-slate-500">
															Keep me signed in on this device for longer.
														</p>
													</div>
												</FormItem>
											)}
										/>

										<FormField
											control={form.control}
											name="password"
											render={({ field }) => (
												<FormItem className="space-y-2">
													<div className="flex items-center justify-between gap-3">
														<FormLabel className="text-slate-700">
															Password
														</FormLabel>
														<Link
															href="/password-reset"
															className="text-sm font-medium text-slate-700 transition hover:text-slate-950"
														>
															Forgot password?
														</Link>
													</div>
													<FormControl>
														<InputGroup className="h-12 rounded-2xl bg-slate-50">
															<InputGroup.Addon align="inline-start">
																<Icons.LockKeyhole className="text-slate-400" />
															</InputGroup.Addon>
															<InputGroup.Input
																{...field}
																type="password"
																placeholder="Enter your password"
																autoComplete="current-password"
																className="text-base text-slate-950 placeholder:text-slate-400"
															/>
														</InputGroup>
													</FormControl>
													<FormMessage />
												</FormItem>
											)}
										/>

										<SubmitButton
											type="submit"
											isSubmitting={isSubmitting || isPending}
											className="h-12 w-full rounded-2xl bg-slate-950 text-sm font-semibold text-white hover:bg-slate-800"
										>
											Sign in
										</SubmitButton>

										<button
											type="button"
											onClick={onSendEmailLink}
											disabled={
												isEmailLinkSubmitting || isSubmitting || isPending
											}
											className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white text-sm font-semibold text-slate-800 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
										>
											{isEmailLinkSubmitting ? (
												<Icons.Loader2 className="size-4 animate-spin" />
											) : (
												<Icons.Mail className="size-4" />
											)}
											Email me a login link
										</button>
									</form>
								</Form>

								<Env isDev>
									<div className="mt-6 border-t border-slate-200 pt-5">
										<p className="mb-3 text-xs font-medium tracking-[0.16em] text-slate-500 uppercase">
											Dev Quick Login
										</p>
										<QuickLogin />
									</div>
								</Env>
							</div>
						</div>
					</section>
				</div>
			</div>
		</main>
	);
}

function getSafeCallbackUrl(value: string | null) {
	if (!value?.startsWith("/")) {
		return null;
	}

	return value;
}

function getLoginErrorMessage(error: string) {
	const message = error.replace(/\+/g, " ");
	if (message.toLowerCase() === "login failed") {
		return "Invalid email or password.";
	}

	return message || "Unable to sign in. Please try again.";
}
