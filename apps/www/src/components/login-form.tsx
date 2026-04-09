"use client";

import { useZodForm } from "@/hooks/use-zod-form";
import { CardContent, CardFooter } from "@gnd/ui/card";
import { Checkbox } from "@gnd/ui/checkbox";
import { Form } from "@gnd/ui/form";
import { z } from "zod";
import FormInput from "./common/controls/form-input";
import { SubmitButton } from "./submit-button";
import { signIn, useSession } from "next-auth/react";
import { useTransition } from "@/utils/use-safe-transistion";

import Link from "@/components/link";
import { parseAsString, useQueryStates } from "nuqs";

import { useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";

const loginSchema = z.object({
	email: z.string().email(),
	password: z.string(),
	rememberMe: z.boolean().default(false),
});
function useLoginEmail() {
	const [params] = useQueryStates({
		token: parseAsString,
	});
	return {
		params,
	};
}
export function LoginForm() {
	const router = useRouter();
	const searchParams = useSearchParams();
	const form = useZodForm(loginSchema, {
		defaultValues: {
			email: "",
			password: "",
			rememberMe: false,
		},
	});
	const loginEmail = useLoginEmail();
	const token = loginEmail.params.token;
	const { data: session } = useSession();
	const callbackUrl = getLoginCallbackUrl(searchParams);

	useEffect(() => {
		if (session?.user?.id) {
			router.replace(callbackUrl);
		}
	}, [callbackUrl, router, session]);

	useEffect(() => {
		if (!token) return;

		signIn("credentials", {
			token,
			callbackUrl,
			redirect: true,
		});
	}, [callbackUrl, token]);

	const [isPending, startTransition] = useTransition();

	const onSubmit = form.handleSubmit(async (data) => {
		startTransition(async () => {
			await signIn("credentials", {
				...data,
				rememberMe: data.rememberMe ? "true" : "false",
				callbackUrl,
				redirect: true,
			});
		});
	});
	return (
		<>
			<Form {...form}>
				<form className="" onSubmit={onSubmit}>
					<CardContent className="space-y-4">
						<FormInput label="Email" control={form.control} name="email" />
						<FormInput
							type="password"
							control={form.control}
							label="Password"
							name="password"
						/>
						<div className="flex items-center justify-between">
							<label
								htmlFor="remember-me"
								className="flex items-center space-x-2 text-sm text-muted-foreground"
							>
								<Checkbox
									id="remember-me"
									checked={form.watch("rememberMe")}
									onCheckedChange={(checked) =>
										form.setValue("rememberMe", checked === true)
									}
								/>
								<span>Remember me</span>
							</label>
							<Link
								href="/login/password-reset"
								className="text-sm text-primary hover:text-primary/80 font-medium transition-colors"
							>
								Forgot password?
							</Link>
						</div>
					</CardContent>
					<CardFooter className="flex flex-col space-y-4 pt-6">
						<SubmitButton
							className="w-full"
							isSubmitting={isPending}
							disabled={isPending}
						>
							Sign in
						</SubmitButton>
					</CardFooter>
				</form>
			</Form>
		</>
	);
}

function getLoginCallbackUrl(searchParams: URLSearchParams) {
	const returnTo = searchParams.get("return_to");
	if (returnTo?.startsWith("/")) {
		return returnTo;
	}

	return "/";
}
