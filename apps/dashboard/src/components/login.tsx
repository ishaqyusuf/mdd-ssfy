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

import { sendEmailLoginLink } from "@/app-deps/(v1)/_actions/auth";
import { Env } from "@/components/env";
import QuickLogin from "@/components/quick-login";
import { SubmitButton } from "@/components/submit-button";
import { useZodForm } from "@/hooks/use-zod-form";
import { useTransition } from "@/utils/use-safe-transistion";
import { Icons } from "@gnd/ui/icons";
import { Input } from "@gnd/ui/input";
import {
	InputGroup,
	InputGroupAddon,
	InputGroupButton,
	InputGroupInput,
} from "@gnd/ui/input-group";
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

export function Login() {
	const router = useRouter();
	const searchParams = useSearchParams();
	const { data: session } = useSession();
	const [isPending, startTransition] = useTransition();
	const [isSubmitting, setIsSubmitting] = useState(false);
	const [isEmailLinkSubmitting, setIsEmailLinkSubmitting] = useState(false);
	const [isGoogleSubmitting, setIsGoogleSubmitting] = useState(false);
	const [loginError, setLoginError] = useState<LoginErrorInfo | null>(null);
	const [isPasswordVisible, setIsPasswordVisible] = useState(false);
	const [emailLinkRecipient, setEmailLinkRecipient] = useState<string | null>(
		null,
	);

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
					const nextError = getLoginErrorInfo(
						result.error,
						result.status,
					);
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
			const email = form.getValues("email");
			await sendEmailLoginLink({
				email,
				callbackUrl,
			});
			setEmailLinkRecipient(email);
			toast.success(
				"If this account is active, a login link is on its way.",
			);
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
				const nextError = getLoginErrorInfo(
					result.error,
					result.status,
				);
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
		<main className="min-h-svh bg-muted/40 text-foreground">
			<div className="mx-auto flex min-h-svh max-w-[1440px] items-center lg:px-6">
				<div className="grid min-h-svh w-full overflow-hidden border-border bg-card lg:min-h-[800px] lg:grid-cols-[1.08fr_0.92fr] lg:rounded-xl lg:border lg:shadow-2xl">
					<section className="relative min-h-[152px] overflow-hidden text-primary-foreground lg:min-h-full">
						<Image
							src="/gnd-backdrop.jpeg"
							alt="GND millwork backdrop"
							fill
							priority
							className="object-cover"
						/>
						<div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(7,12,20,0.08)_0%,rgba(7,12,20,0.3)_45%,rgba(7,12,20,0.8)_100%)]" />

						<div className="relative z-10 flex h-full flex-col justify-between p-4 sm:p-6 lg:p-10">
							<div className="inline-flex w-fit items-center rounded-lg bg-background/95 px-3 py-2 text-foreground shadow-sm backdrop-blur">
								<Icons.logoLg width={110} />
							</div>

							<div className="hidden max-w-lg lg:block">
								<p className="text-xs font-medium tracking-[0.2em] text-primary-foreground/70 uppercase">
									GND Workspace
								</p>
								<h1 className="mt-4 text-5xl font-semibold tracking-[-0.055em] text-primary-foreground">
									Sign in and get back to work.
								</h1>
								<p className="mt-4 max-w-md text-base leading-7 text-primary-foreground/80">
									A focused, secure place to keep every GND
									workspace moving.
								</p>
								<div className="mt-6 inline-flex max-w-md items-center rounded-lg border border-primary-foreground/20 bg-black/20 px-4 py-3 text-sm leading-6 text-primary-foreground/80 backdrop-blur-sm">
									Email and password sign-in, token login
									links, safe redirects, and password reset
									are all preserved.
								</div>
							</div>
						</div>
					</section>

					<section className="flex items-start bg-card px-6 py-10 sm:px-10 lg:items-center lg:px-16 lg:py-14">
						<div className="mx-auto w-full max-w-[430px]">
							<div className="mb-8 flex flex-col gap-3">
								<div className="flex size-11 items-center justify-center rounded-lg bg-primary text-primary-foreground">
									<Icons.LockKeyhole className="size-5" />
								</div>
								<h2 className="text-3xl font-semibold tracking-[-0.045em] text-foreground">
									Welcome back
								</h2>
								<p className="text-sm leading-6 text-muted-foreground">
									Use your GND credentials to continue.
								</p>
							</div>

							{emailLinkRecipient ? (
								<EmailLinkConfirmation
									email={emailLinkRecipient}
									onUsePassword={() =>
										setEmailLinkRecipient(null)
									}
								/>
							) : (
								<Form {...form}>
									<form
										className="flex flex-col gap-5"
										onSubmit={onSubmit}
									>
										<FormField
											control={form.control}
											name="email"
											render={({ field }) => (
												<FormItem className="flex flex-col gap-2">
													<FormLabel>Email</FormLabel>
													<FormControl>
														<Input
															{...field}
															type="email"
															placeholder="you@gndmillwork.com"
															autoComplete="email"
															aria-invalid={
																!!form.formState
																	.errors
																	.email
															}
															className="h-12 rounded-lg bg-background text-base"
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
												<FormItem className="flex flex-row items-start gap-3 rounded-lg border border-border bg-muted/50 px-4 py-3">
													<FormControl>
														<Checkbox
															checked={
																field.value
															}
															onCheckedChange={(
																checked,
															) =>
																field.onChange(
																	checked ===
																		true,
																)
															}
															aria-label="Remember me on this device"
															className="mt-0.5"
														/>
													</FormControl>
													<div className="flex flex-col gap-1">
														<FormLabel className="text-sm font-medium text-foreground">
															Remember me
														</FormLabel>
														<p className="text-xs leading-5 text-muted-foreground">
															Keep me signed in on
															this device for
															longer.
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
														<FormLabel>
															Password
														</FormLabel>
														<Link
															href="/password-reset"
															className="text-sm font-medium text-primary underline-offset-4 hover:underline"
														>
															Forgot password?
														</Link>
													</div>
													<InputGroup className="h-12 rounded-lg bg-background">
														<FormControl>
															<InputGroupInput
																{...field}
																type={
																	isPasswordVisible
																		? "text"
																		: "password"
																}
																placeholder="Enter your password"
																autoComplete="current-password"
																aria-invalid={
																	!!form
																		.formState
																		.errors
																		.password
																}
																className="h-full px-3 text-base"
															/>
														</FormControl>
														<InputGroupAddon align="inline-end">
															<InputGroupButton
																type="button"
																size="icon-sm"
																aria-label={
																	isPasswordVisible
																		? "Hide password"
																		: "Show password"
																}
																aria-pressed={
																	isPasswordVisible
																}
																onClick={() =>
																	setIsPasswordVisible(
																		(
																			visible,
																		) =>
																			!visible,
																	)
																}
															>
																{isPasswordVisible ? (
																	<Icons.EyeOff />
																) : (
																	<Icons.Eye />
																)}
															</InputGroupButton>
														</InputGroupAddon>
													</InputGroup>
													<FormMessage />
												</FormItem>
											)}
										/>

										{loginError ? (
											<LoginErrorAlert
												error={loginError}
											/>
										) : null}

										<SubmitButton
											type="submit"
											isSubmitting={
												isSubmitting ||
												isPending ||
												isGoogleSubmitting
											}
											className="h-12 w-full rounded-lg text-sm font-semibold"
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
											className="h-12 w-full rounded-lg text-sm font-semibold"
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
											className="h-12 w-full rounded-lg text-sm font-semibold"
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
							)}

							<Env isDev>
								<div className="mt-6 border-t border-border pt-5">
									<p className="mb-3 text-xs font-medium tracking-[0.16em] text-muted-foreground uppercase">
										Dev Quick Login
									</p>
									<QuickLogin />
								</div>
							</Env>
						</div>
					</section>
				</div>
			</div>
		</main>
	);
}

function LoginErrorAlert({ error }: { error: LoginErrorInfo }) {
	return (
		<Alert variant="destructive">
			<Icons.AlertCircle className="size-4" />
			<AlertTitle>{error.title}</AlertTitle>
			<AlertDescription className="mt-1 flex flex-col gap-1 text-sm">
				<p>{error.message}</p>
				{error.details ? (
					<p className="text-xs">{error.details}</p>
				) : null}
			</AlertDescription>
		</Alert>
	);
}

function EmailLinkConfirmation({
	email,
	onUsePassword,
}: {
	email: string;
	onUsePassword: () => void;
}) {
	return (
		<div className="flex flex-col gap-5">
			<Alert className="border-success/40 bg-success/10 text-foreground">
				<Icons.Mail className="size-4" />
				<AlertTitle>Check your email</AlertTitle>
				<AlertDescription className="mt-1 text-sm">
					We sent a secure sign-in link to <strong>{email}</strong> if
					that address belongs to an active GND account.
				</AlertDescription>
			</Alert>

			<p className="text-sm leading-6 text-muted-foreground">
				Use the latest email to sign in and return to the page you were
				trying to reach.
			</p>

			<Button
				type="button"
				className="h-12 rounded-lg"
				onClick={onUsePassword}
			>
				Use password instead
			</Button>
			<p className="text-center text-xs text-muted-foreground">
				No email? Check junk mail, then request another sign-in link.
			</p>
		</div>
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
