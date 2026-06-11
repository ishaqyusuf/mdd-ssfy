"use client";

import { signIn, signInWithGoogle, useSession } from "@/lib/auth/client";
import Image from "next/image";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { z } from "zod";

import { Alert, AlertDescription, AlertTitle } from "@gnd/ui/alert";
import { Button } from "@gnd/ui/button";
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
import { Input } from "@gnd/ui/input";
import { toast } from "sonner";

const loginSchema = z.object({
	email: z.string().email({ message: "Enter a valid work email address." }),
	password: z.string().min(1, { message: "Password is required." }),
	rememberMe: z.boolean().default(false),
});

type LoginFormValues = z.infer<typeof loginSchema>;
type LoginErrorInfo = {
	title: string;
	message: string;
	details?: string;
};

export function LoginV2() {
	const router = useRouter();
	const searchParams = useSearchParams();
	const { data: session } = useSession();
	const [isPending, startTransition] = useTransition();
	const [isSubmitting, setIsSubmitting] = useState(false);
	const [isEmailLinkSubmitting, setIsEmailLinkSubmitting] = useState(false);
	const [isGoogleSubmitting, setIsGoogleSubmitting] = useState(false);
	const [loginError, setLoginError] = useState<LoginErrorInfo | null>(null);
	const [isPasswordVisible, setIsPasswordVisible] = useState(false);

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

		const nextError = getLoginErrorInfo(error, searchParams.get("status"));
		setLoginError(nextError);
		toast.error(nextError.message);
	}, [searchParams]);

	useEffect(() => {
		if (!token) return;

		signIn("credentials", {
			token,
			callbackUrl,
			redirect: true,
		}).catch((error) => {
			const nextError = getLoginErrorInfo(error);
			setLoginError(nextError);
			toast.error(nextError.message);
		});
	}, [callbackUrl, token]);

	const onSubmit = form.handleSubmit((values: LoginFormValues) => {
		setIsSubmitting(true);
		setLoginError(null);
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
					const nextError = getLoginErrorInfo(result.error, result.status);
					setLoginError(nextError);
					toast.error(nextError.message);
					setIsSubmitting(false);
					return;
				}

				window.location.assign(result.url || callbackUrl);
			} catch (error) {
				const nextError = getLoginErrorInfo(error);
				setLoginError(nextError);
				setIsSubmitting(false);
				toast.error(nextError.message);
			}
		});
	});

	async function onSendEmailLink() {
		const hasValidEmail = await form.trigger("email");
		if (!hasValidEmail) return;

		setIsEmailLinkSubmitting(true);
		setLoginError(null);
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

	async function onGoogleSignIn() {
		setIsGoogleSubmitting(true);
		setLoginError(null);

		try {
			const result = await signInWithGoogle({
				callbackUrl,
				redirect: false,
			});

			if (!result.ok) {
				const nextError = getLoginErrorInfo(result.error, result.status);
				setLoginError(nextError);
				toast.error(nextError.message);
				setIsGoogleSubmitting(false);
				return;
			}

			window.location.assign(result.url || callbackUrl);
		} catch (error) {
			const nextError = getLoginErrorInfo(error);
			setLoginError(nextError);
			setIsGoogleSubmitting(false);
			toast.error(nextError.message);
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
									<form className="flex flex-col gap-5" onSubmit={onSubmit}>
										<FormField
											control={form.control}
											name="email"
											render={({ field }) => (
												<FormItem className="flex flex-col gap-2">
													<FormLabel className="text-slate-700">
														Email
													</FormLabel>
													<FormControl>
														<Input
															{...field}
															type="email"
															placeholder="you@gndmillwork.com"
															autoComplete="email"
															aria-invalid={!!form.formState.errors.email}
															className="h-12 rounded-2xl border-slate-200 bg-slate-50 text-base text-slate-950 placeholder:text-slate-400"
														/>
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
												<FormItem className="flex flex-col gap-2">
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
														<div className="relative">
															<Input
																{...field}
																type={isPasswordVisible ? "text" : "password"}
																placeholder="Enter your password"
																autoComplete="current-password"
																aria-invalid={!!form.formState.errors.password}
																className="h-12 rounded-2xl border-slate-200 bg-slate-50 pr-12 text-base text-slate-950 placeholder:text-slate-400"
															/>
															<Button
																type="button"
																variant="ghost"
																size="icon-sm"
																className="absolute top-1/2 right-2 -translate-y-1/2 text-slate-500 hover:text-slate-950"
																aria-label={
																	isPasswordVisible
																		? "Hide password"
																		: "Show password"
																}
																aria-pressed={isPasswordVisible}
																onClick={() =>
																	setIsPasswordVisible((visible) => !visible)
																}
															>
																{isPasswordVisible ? (
																	<Icons.EyeOff />
																) : (
																	<Icons.Eye />
																)}
															</Button>
														</div>
													</FormControl>
													<FormMessage />
												</FormItem>
												)}
										/>

										{loginError ? (
											<LoginErrorAlert error={loginError} />
										) : null}

										<SubmitButton
											type="submit"
											isSubmitting={
												isSubmitting || isPending || isGoogleSubmitting
											}
											className="h-12 w-full rounded-2xl bg-slate-950 text-sm font-semibold text-white hover:bg-slate-800"
										>
											Sign in
										</SubmitButton>

										<Button
											type="button"
											variant="outline"
											onClick={onGoogleSignIn}
											disabled={
												isGoogleSubmitting ||
												isEmailLinkSubmitting ||
												isSubmitting ||
												isPending
											}
											className="h-12 w-full rounded-2xl border-slate-200 text-sm font-semibold text-slate-800"
										>
											{isGoogleSubmitting ? (
												<Icons.Loader2
													data-icon="inline-start"
													className="animate-spin"
												/>
											) : (
												<span
													aria-hidden="true"
													className="inline-flex size-4 items-center justify-center text-sm font-semibold"
												>
													G
												</span>
											)}
											Continue with Google
										</Button>

										<Button
											type="button"
											variant="outline"
											onClick={onSendEmailLink}
											disabled={
												isEmailLinkSubmitting ||
												isGoogleSubmitting ||
												isSubmitting ||
												isPending
											}
											className="h-12 w-full rounded-2xl border-slate-200 text-sm font-semibold text-slate-800"
										>
											{isEmailLinkSubmitting ? (
												<Icons.Loader2
													data-icon="inline-start"
													className="animate-spin"
												/>
											) : (
												<Icons.Mail data-icon="inline-start" />
											)}
											Email me a login link
										</Button>
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

function LoginErrorAlert({ error }: { error: LoginErrorInfo }) {
	return (
		<Alert className="border-red-200 bg-red-50 text-red-950">
			<Icons.AlertCircle className="size-4 text-red-600" />
			<AlertTitle>{error.title}</AlertTitle>
			<AlertDescription className="mt-1 space-y-1 text-sm text-red-800">
				<p>{error.message}</p>
				{error.details ? (
					<p className="text-xs text-red-700">{error.details}</p>
				) : null}
			</AlertDescription>
		</Alert>
	);
}

function getSafeCallbackUrl(value: string | null) {
	if (!value?.startsWith("/")) {
		return null;
	}

	return value;
}

function getLoginErrorInfo(
	error: unknown,
	status?: number | string | null,
): LoginErrorInfo {
	const rawMessage =
		typeof error === "string"
			? error
			: error instanceof Error
				? error.message
				: null;
	const message = decodeLoginError(rawMessage);
	const normalized = message.toLowerCase();
	const details =
		status && Number(status) >= 400
			? `Authentication service returned HTTP ${status}.`
			: undefined;

	if (
		normalized === "login failed" ||
		normalized.includes("invalid email") ||
		normalized.includes("invalid password") ||
		normalized.includes("unauthorized")
	) {
		return {
			title: "Sign-in failed",
			message:
				"We could not match that email and password. Check the email, password, or configured master password and try again.",
			details,
		};
	}

	return {
		title: "Unable to sign in",
		message: message || "The login request could not be completed.",
		details,
	};
}

function decodeLoginError(error?: string | null) {
	if (!error) return "";

	try {
		return decodeURIComponent(error.replace(/\+/g, " "));
	} catch {
		return error.replace(/\+/g, " ");
	}
}
