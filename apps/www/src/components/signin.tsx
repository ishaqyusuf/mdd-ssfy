"use client";

import Image from "next/image";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { z } from "zod";

import { SubmitButton } from "@/components/submit-button";
import { useZodForm } from "@/hooks/use-zod-form";
import { Checkbox } from "@gnd/ui/checkbox";
import { Form } from "@gnd/ui/form";
import { signIn } from "next-auth/react";
import { useTransition } from "@/utils/use-safe-transistion";
import { Icons } from "@/components/_v1/icons";
import { useEffect } from "react";
import { InputField } from "@gnd/ui/controls-2/input-field";
import { parseAsString, useQueryStates } from "nuqs";

const loginSchema = z.object({
	email: z.string().email({ message: "Please enter a valid email address." }),
	password: z.string().optional(),
	rememberMe: z.boolean().default(false),
});

type LoginForm = z.infer<typeof loginSchema>;

function useLoginEmail() {
	const [params] = useQueryStates({
		token: parseAsString,
	});

	return {
		params,
	};
}

export function SigninComponent() {
	const searchParams = useSearchParams();
	const callbackUrl =
		getSafeCallbackUrl(searchParams.get("return_to")) ||
		getSafeCallbackUrl(searchParams.get("callbackUrl")) ||
		"/";
	const [isPending, startTransition] = useTransition();

	const form = useZodForm(loginSchema, {
		defaultValues: {
			email: "",
			password: "",
			rememberMe: false,
		},
	});
	const loginEmail = useLoginEmail();
	const token = loginEmail.params.token;

	useEffect(() => {
		if (!token) return;

		signIn("credentials", {
			token,
			callbackUrl,
			redirect: true,
		});
	}, [callbackUrl, token]);

	const onSubmit = form.handleSubmit(async (data: LoginForm) => {
		startTransition(async () => {
			await signIn("credentials", {
				email: data.email,
				password: data.password ?? "",
				rememberMe: data.rememberMe ? "true" : "false",
				callbackUrl,
				redirect: true,
			});
		});
	});

	return (
		<div className="w-full min-h-screen lg:grid lg:grid-cols-2">
			<div className="relative hidden h-full flex-col bg-muted p-10 text-white lg:flex dark:border-r">
				<div className="absolute inset-0 bg-zinc-900" />
				<Image
					src="/gnd-backdrop.png"
					alt="Image"
					fill
					className="absolute inset-0 h-full w-full object-cover opacity-20"
				/>
				<div className="relative z-20 flex items-center text-lg font-medium">
					<Icons.logo />
				</div>
			</div>
			<div className="flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
				<div className="mx-auto w-full max-w-[400px] grid gap-6">
					<div className="grid gap-2 text-center">
						<h1 className="text-3xl font-bold tracking-tight">Sign In</h1>
						<p className="text-balance text-muted-foreground">
							Enter your email and password to sign in.
						</p>
					</div>
					<Form {...form}>
						<form onSubmit={onSubmit} className="grid gap-4">
							<InputField
								name="email"
								type="email"
								label="Email"
								prefix={<Icons.Email className="size-4" />}
								control={form.control}
								placeholder="m@example.com"
							/>
							<InputField
								name="password"
								type="password"
								label="Password"
								placeholder="Password"
								prefix={<Icons.Key className="size-4" />}
								control={form.control}
							/>
							<label
								htmlFor="signin-remember-me"
								className="flex items-center gap-2 text-sm text-muted-foreground"
							>
								<Checkbox
									id="signin-remember-me"
									checked={form.watch("rememberMe")}
									onCheckedChange={(checked) =>
										form.setValue("rememberMe", checked === true)
									}
								/>
								<span>Remember me on this device</span>
							</label>
							<div className="text-sm">
								<Link
									href="/login/password-reset"
									className="font-medium text-primary hover:text-primary/80"
								>
									Forgot your password?
								</Link>
							</div>

							<SubmitButton className="w-full" isSubmitting={isPending}>
								Sign In
							</SubmitButton>
						</form>
					</Form>
				</div>
			</div>
		</div>
	);
}

function getSafeCallbackUrl(value: string | null) {
	if (!value?.startsWith("/")) {
		return null;
	}

	return value;
}
